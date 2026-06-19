# 認証判定ロジック分散状況監査レポート

**作成日**: 2026年5月15日
**重要度**: 🔴 **HIGH** - 複数の重複実装と矛盾が検出されました

---

## 📊 監査結果サマリー

| 項目 | 状態 | 優先度 | 詳細 |
|------|------|--------|------|
| **ルートアカウント確認ロジック** | ⚠️ 重複実装 | 🔴 HIGH | 2ファイルで同じ `hasRootAccount()` 実装 |
| **セッション取得ロジック** | ⚠️ 部分重複 | 🔴 HIGH | auth.ts と auth-session.ts で重複コード |
| **プロバイダー判定ロジック** | ⚠️ 未完全 | 🟠 MEDIUM | `getPrimaryAuthProvider()` が複数Google非対応 |
| **認証チェック（API）** | ⚠️ 重複 | 🟠 MEDIUM | requireAuth と optionalAuth で重複ロジック |
| **エラーハンドリング** | ✅ 統一的 | 🟢 LOW | `auth-errors.ts` で一元管理 |
| **ルーティング層認証** | ⚠️ 独立 | 🟡 MEDIUM | proxy.ts が独立した認証ロジック実装 |

---

## 🔴 **詳細分析**

### 1️⃣ **【HIGH】ルートアカウント確認ロジックの重複**

#### 🔍 **発見された重複**

**ファイル1**: [src/lib/auth/root-account-guard.ts](src/lib/auth/root-account-guard.ts)

```typescript
export async function hasRootAccount(userId: string): Promise<boolean> {
  if (isDevelopmentMockDataEnabled()) {
    return hasDevelopmentMockRootAccount(userId);
  }

  try {
    const result = await withRlsUserContext(userId, (tx) =>
      tx
        .select({ id: rootAccounts.id })
        .from(rootAccounts)
        .where(eq(rootAccounts.authUserId, userId))
        .limit(1)
    );
    return result.length > 0;
  } catch (error) {
    logger.error("Failed to check root account", error, { userId });
    return false;
  }
}
```

**ファイル2**: [src/lib/auth/setup-root-account.ts](src/lib/auth/setup-root-account.ts)

```typescript
export async function hasRootAccount(userId: string): Promise<boolean> {
  try {
    const result = await withRlsUserContext(userId, (tx) =>
      tx
        .select({ id: rootAccounts.id })
        .from(rootAccounts)
        .where(eq(rootAccounts.authUserId, userId))
        .limit(1)
    );

    return result.length > 0;
  } catch (error) {
    logger.error("hasRootAccount failed", error, { userId });
    return false;
  }
}
```

#### ⚠️ **問題点**

```
❌ 同じ関数が2つのファイルで定義されている
   → どちらを使用すべきか不明確
   → 保守時に2箇所修正が必要
   → バージョン乖離のリスク

❌ root-account-guard.ts は isDevelopmentMockDataEnabled() チェックあり
   → setup-root-account.ts には無い
   → 開発環境での動作が異なる可能性
```

#### 🔧 **推奨解決策**

```typescript
// ✅ 統一実装場所: src/lib/auth/root-account-guard.ts に一本化
// 他のファイルからは import して再export

// src/lib/auth/setup-root-account.ts
export { hasRootAccount } from '@/lib/auth/root-account-guard';

// または src/lib/auth/index.ts で一元管理
export { hasRootAccount, getRootAccountId } from './root-account-guard';
```

---

### 2️⃣ **【HIGH】セッション取得ロジックの重複**

#### 🔍 **複数の場所でセッション取得が実装**

**場所1**: [src/lib/auth/helper.ts](src/lib/auth/helper.ts) - Server Component用

```typescript
export const getSession = cache(async () => {
  try {
    // 開発時ダミー認証機能
    if (isDevelopmentDummyAuthEnabled(developmentDummyAuthCookie)) {
      const dummySession = createDummySessionWithActiveProfile(...);
      return dummySession;
    }

    const betterAuthResult = await serverAuth.api.getSession({ headers: headersList });

    if (betterAuthResult?.user) {
      const primaryAuthProvider = await getPrimaryAuthProvider(betterAuthResult.user.id);
      return { ...betterAuthResult, primaryAuthProvider };
    }

    return betterAuthResult ?? null;
  } catch (error) {
    logger.error("[getSession] Error:", undefined, { error: ... });
    return null;
  }
});
```

**場所2**: [src/lib/api/middleware/auth.ts](src/lib/api/middleware/auth.ts) - API requireAuth用

```typescript
export const requireAuth: MiddlewareHandler<{ Variables: SessionContext }> = async (c, next) => {
  try {
    const useDevelopmentMockAuth = isDevelopmentDummyAuthEnabled(...);

    if (useDevelopmentMockAuth) {
      const dummySession = createDummySession(dummyUserType);
      const existingRootAccount = await getRootAccountByAuthUserId(dummySession.user.id);

      const developmentAuthSession: AuthSession = {
        user: { id, email, name, role, hasRootAccount },
        session: { id, expiresAt },
      };
      c.set('authSession', developmentAuthSession);
      await next();
      return;
    }

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user || !session?.session) {
      throw createApiError('UNAUTHORIZED', 'Authentication required');
    }

    const authSession: AuthSession = { user: {...}, session: {...} };
    c.set('authSession', authSession);
    await next();
  } catch (error) {
    throw error;
  }
};
```

**場所3**: [src/lib/api/middleware/auth-session.ts](src/lib/api/middleware/auth-session.ts) - Hono全体用

```typescript
export const betterAuthSessionMiddleware = () => {
  return async (c: Context, next: Next): Promise<void> => {
    try {
      const developmentDummyAuthCookie = getCookie(c, DEV_DUMMY_AUTH_COOKIE_NAME) ?? null;

      if (isDevelopmentMockDataEnabled(...) || isDevelopmentDummyAuthEnabled(...)) {
        const dummySession = createDummySession(resolveDummyUserType());
        c.set('session', { user: dummySession.user, session: dummySession.session });
        c.set('user', dummySession.user);
        await next();
        return;
      }

      const cookieHeader = c.req.header('Cookie') || '';
      const session = await auth.api.getSession({ headers: { cookie: cookieHeader } });

      c.set('session', session ?? undefined);
      c.set('user', session?.user ?? null);
      await next();
    } catch (error) {
      logger.error('[API] Session retrieval failed - RLS context not applied', error, {...});
      c.set('session', undefined);
      c.set('user', null);
      await next();
    }
  };
};
```

#### ⚠️ **問題点**

```
❌ 3箇所で独立した実装
   → ダミー認証判定ロジックが3回実装
   → ルートアカウント確認ロジックが異なる
     - auth.ts (requireAuth): await getRootAccountByAuthUserId(...) + hasRootAccount チェック
     - auth-session.ts: ロジックなし
     - helper.ts: await getPrimaryAuthProvider(...) 追加

❌ エラーハンドリングが異なる
   - helper.ts: logger.error で return null
   - requireAuth: throw createApiError('UNAUTHORIZED', ...)
   - auth-session.ts: logger.error で安全側に倒す (undefined)

❌ 設定される型が異なる
   - requireAuth: AuthSession 型
   - auth-session.ts: session/user の別々設定
   - helper.ts: primaryAuthProvider を追加
```

#### 🔧 **推奨解決策**

```typescript
// ✅ 統一セッション取得関数を作成
// src/lib/auth/unified-session.ts

export interface SessionWithProvider {
  user: BetterAuthUser;
  session: BetterAuthSession;
  primaryAuthProvider: string;
}

export async function getSessionWithProvider(
  headers: Headers | HeadersInit
): Promise<SessionWithProvider | null> {
  try {
    const session = await auth.api.getSession({ headers });
    if (!session?.user) return null;

    const primaryAuthProvider = await getPrimaryAuthProvider(session.user.id);
    return { ...session, primaryAuthProvider };
  } catch (error) {
    logger.error("[getSessionWithProvider] Error:", error);
    return null;
  }
}

// src/lib/auth/development-session.ts
export async function getDevelopmentDummySessionIfEnabled(
  developmentDummyAuthCookie: string | null
): Promise<SessionWithProvider | null> {
  if (!isDevelopmentDummyAuthEnabled(developmentDummyAuthCookie)) {
    return null;
  }

  const dummyUserType = resolveDummyUserType();
  const dummySession = createDummySessionWithActiveProfile(dummyUserType);

  // ダミーセッションでのルートアカウント確認
  const existingRootAccount = await getRootAccountByAuthUserId(dummySession.user.id);
  const hasRootAccount = Boolean(existingRootAccount) || dummySession.user.hasRootAccount === true;

  return {
    ...dummySession,
    primaryAuthProvider: 'mock',
    user: { ...dummySession.user, hasRootAccount },
  };
}
```

---

### 3️⃣ **【MEDIUM】プロバイダー判定ロジックの未完全実装**

#### 🔍 **現在の実装**

[src/lib/auth/helper.ts](src/lib/auth/helper.ts) - `getPrimaryAuthProvider()`

```typescript
async function getPrimaryAuthProvider(userId: string): Promise<string> {
  try {
    const accountRecords = await withRlsUserContext(userId, (tx) =>
      tx.select().from(schema.accounts).where(eq(schema.accounts.userId, userId))
    );

    // OAuth account を探す
    const oauthAccount = accountRecords.find(
      (acc) => acc.providerId === "google" || acc.providerId === "github"
    );
    if (oauthAccount) {
      return oauthAccount.providerId;  // ❌ 最初のGoogleを選定（複数対応不完全）
    }

    const anonymousAccount = accountRecords.find(
      (acc) => acc.providerId === "anonymous"
    );
    if (anonymousAccount) {
      return "anonymous";
    }

    const emailAccount = accountRecords.find(
      (acc) => acc.providerId === "credential" || acc.providerId === "email-password"
    );
    return emailAccount ? "email" : "unknown";
  } catch (error) {
    logger.warn("[getPrimaryAuthProvider] Error:", { error: ... });
    return "unknown";
  }
}
```

#### ⚠️ **問題点**

```
❌ 複数Google認証に非対応
   現在: 複数Google account がある場合、最初の1つのみを返す
   → personal@gmail.com と work@gmail.com の区別ができない

❌ プロバイダー優先度が硬コード化
   → 優先度ルール：OAuth > Anonymous > Email
   → 複数認証実装後に「どのGoogleから最後にログインしたか」追跡不可

❌ lastUsedAt トラッキングなし
   → accounts テーブルに lastUsedAt 列がない
   → 認証リンク管理時に「最後のログイン日時」を表示できない
```

#### 🔧 **推奨解決策（Phase 1では設計、Phase 2で実装）**

```typescript
// ✅ accounts テーブルに lastUsedAt を追加
export const accounts = pgTable("account", {
  // ...existing...
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }), // 新規追加
});

// ✅ 複数プロバイダー対応のロジック
export async function getPrimaryAuthProvider(userId: string): Promise<{
  provider: string;
  providerEmail?: string;
  lastUsedAt: Date | null;
}> {
  const accountRecords = await withRlsUserContext(userId, (tx) =>
    tx
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, userId))
      .orderBy(desc(schema.accounts.lastUsedAt)) // 最新順
  );

  // 最も最近使用されたプロバイダーを返す
  if (accountRecords.length === 0) {
    return { provider: 'unknown', lastUsedAt: null };
  }

  const most_recent = accountRecords[0];
  return {
    provider: most_recent.providerId,
    providerEmail: most_recent.accountEmail, // 新規フィールド
    lastUsedAt: most_recent.lastUsedAt,
  };
}
```

---

### 4️⃣ **【MEDIUM】API ミドルウェアでのルートアカウント確認の重複**

#### 🔍 **確認ロジックの重複**

**requireAuth ミドルウェア**: [src/lib/api/middleware/auth.ts](src/lib/api/middleware/auth.ts) (line 66-75)

```typescript
const existingRootAccount = await getRootAccountByAuthUserId(dummySession.user.id);
const hasRootAccount = Boolean(existingRootAccount) || dummySession.user.hasRootAccount === true;

const developmentAuthSession: AuthSession = {
  user: {
    id: dummySession.user.id,
    hasRootAccount,  // ✅ 確認済み
  },
  // ...
};
```

**optionalAuth ミドルウェア**: [src/lib/api/middleware/auth.ts](src/lib/api/middleware/auth.ts) (line 147-156)

```typescript
// 同じ確認ロジックが重複実装
const existingRootAccount = await getRootAccountByAuthUserId(dummySession.user.id);
const hasRootAccount = Boolean(existingRootAccount) || dummySession.user.hasRootAccount === true;

const developmentAuthSession: AuthSession = {
  user: {
    id: dummySession.user.id,
    hasRootAccount,
  },
  // ...
};
```

#### ⚠️ **問題点**

```
❌ 同じロジックが2回実装
   → DB クエリが重複実行
   → 保守時に2箇所修正必要

❌ 実 Better Auth セッション処理には無い
   → requireAuth/optionalAuth で getRootAccountByAuthUserId() 呼び出し
   → betterAuthSessionMiddleware では呼び出し無し
   → ミドルウェアチェーン順序による矛盾の可能性
```

#### 🔧 **推奨解決策**

```typescript
// ✅ 共通ロジック抽出
function buildAuthSession(session: BetterAuthSession, isDevelopment = false): AuthSession {
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      role: session.user.role ?? null,
    },
    session: {
      id: session.session.id,
      expiresAt: session.session.expiresAt,
    },
  };
}

// requireAuth と optionalAuth で共通利用
const authSession = buildAuthSession(session);
c.set('authSession', authSession);
```

---

### 5️⃣ **【MEDIUM】ルーティング層での認証ロジック分離**

#### 🔍 **proxy.ts の独立した認証実装**

[src/proxy.ts](src/proxy.ts)

```typescript
const resolveEffectiveOnboardingCompletion = async (user: unknown): Promise<boolean> => {
  const userId = getUserId(user);
  if (!userId) return false;

  try {
    const completionSummary = await getRootAccountCompletionSummary(userId);
    return completionSummary.status !== "not_started";
  } catch (error) {
    const fallbackHasRootAccount = await hasRootAccount(userId);
    logger.warn("Failed to resolve effective onboarding completion", {
      userId,
      error: error instanceof Error ? error.message : String(error),
      fallbackHasRootAccount,
      event: "ONBOARDING_COMPLETION_FALLBACK",
    });
    return fallbackHasRootAccount;
  }
};

// ルーティング層でセッション取得
let session = null;
const useDevelopmentDummyAuth = isDevelopmentDummyAuthEnabled(developmentDummyAuthCookie);

if (useDevelopmentDummyAuth) {
  const dummyUserType = (process.env.DUMMY_USER_TYPE || "USER1") as "USER1" | "USER2" | "USER3";
  session = createDummySession(dummyUserType);
} else {
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    // エラー処理
  }
}
```

#### ⚠️ **問題点**

```
❌ ルーティング層（proxy.ts）でセッション取得が独立
   → API ミドルウェアと重複
   → 認証失敗時のハンドリング方法が異なる
   → proxy.ts では AuthenticationError 例外を発生、ミドルウェアでは 401 返却

❌ ダミー認証判定が3回実装
   1. proxy.ts
   2. requireAuth middleware
   3. optionalAuth middleware
```

---

## ✅ **【LOW】エラーハンドリングは統一的**

### 🔍 **一元管理されている**

| ファイル | 役割 | 状態 |
|----------|------|------|
| [src/lib/auth/auth-errors.ts](src/lib/auth/auth-errors.ts) | OAuth エラーメッセージ | ✅ 一元管理 |
| [src/lib/errors/app-error.ts](src/lib/errors/app-error.ts) | アプリケーションエラー基底クラス | ✅ 一元管理 |
| [src/lib/errors/messages.ts](src/lib/errors/messages.ts) | エラーメッセージ辞書 | ✅ 一元管理 |

### ✅ **良い実装例**

```typescript
// src/components/auth/social-login-buttons/social-login-buttons.tsx
const handleSocialLogin = async (provider: SocialProvider) => {
  try {
    const result = await signIn.social({ provider, callbackURL: ROUTES.HOME });
    if (result.error) {
      setError(getOAuthErrorInfo(result.error, provider));  // ✅ 一元化
    }
  } catch (err) {
    setError(getOAuthErrorInfo(err, provider));  // ✅ 一元化
  }
};
```

---

## 📋 **修正優先順位表**

| 順位 | 項目 | 影響範囲 | 作業量 | 優先度 |
|------|------|---------|--------|--------|
| **1** | `hasRootAccount()` 重複削除 | 2ファイル | 小 | 🔴 HIGH |
| **2** | セッション取得ロジック統一 | 3ファイル | 大 | 🔴 HIGH |
| **3** | プロバイダー判定ロジック改善 | 1ファイル + DB | 中 | 🟠 MEDIUM |
| **4** | API ミドルウェア重複削除 | 1ファイル | 小 | 🟠 MEDIUM |
| **5** | proxy.ts との統合検討 | 1ファイル | 中 | 🟡 LOW |

---

## 🛠️ **Phase 1 実装計画**

### **Week 1: 重複削除（短期修正）**

```bash
# Task 1: hasRootAccount() 統一
- root-account-guard.ts に統一実装
- setup-root-account.ts から import 再export
- index.ts で export

# Task 2: セッション取得統一インタフェース設計
- unified-session.ts 作成
- development-session.ts 作成
- 3つのミドルウェア統一
```

### **Week 2: プロバイダー判定改善**

```bash
# Task 3: 複数Google認証対応
- accounts テーブルに lastUsedAt 追加
- getPrimaryAuthProvider() 改善
- マイグレーション実施

# Task 4: API ミドルウェア重複削除
- 共通関数 buildAuthSession() 作成
- requireAuth / optionalAuth 簡略化
```

---

## 💡 **複数認証リンク実装への影響**

```
🔴 **高リスク**: 現在の分散状況で複数認証実装を進めると
   ├─ linked_providers テーブル追加時にも同じ問題が繰り返される
   ├─ プロバイダー判定ロジックがさらに複雑化
   └─ 保守性が極度に低下

✅ **推奨**: Phase 1A（DB スキーマ）の前に、必ずこれらの重複を解消
   ├─ 統一されたセッション取得関数の構築
   ├─ プロバイダー判定ロジックの明確化
   └─ ルートアカウント確認ロジックの一本化
```

---

**作成者**: GitHub Copilot
**次のステップ**: Phase 1A（DB スキーマ）実装前に、Week 1 の重複削除タスクを完了してください
