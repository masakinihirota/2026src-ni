# 既存認証実装の詳細監査レポート

**作成日**: 2026年5月15日
**対象**: Google/GitHub OAuth認証・セッション管理・ルートアカウント
**目的**: 複数認証リンク方式（選択肢1）実装の前提条件確認

---

## 📊 実装状況サマリー

| 項目 | 実装状況 | 進度 | 備考 |
|------|--------|------|------|
| **Better Auth 設定** | ✅ 実装済み | 100% | Google/GitHub OAuth 常時有効 |
| **ログインUI** | ✅ 実装済み | 100% | Google/GitHub ボタン既存 |
| **セッション管理** | ✅ 実装済み | 100% | キャッシュ付きサーバー側実装 |
| **DB スキーマ** | ⚠️ 部分実装 | 80% | accounts表で複数provider対応可だが、リンク管理テーブルなし |
| **複数認証リンク管理** | ❌ 未実装 | 0% | **新規実装が必要** |
| **認証履歴記録** | ❌ 未実装 | 0% | **新規実装が必要** |

---

## 🔍 詳細分析

### 1️⃣ Better Auth 設定の現状

**ファイル**: [src/lib/auth.ts](src/lib/auth.ts)

#### ✅ 実装されている機能

```typescript
// Google / GitHub OAuth 常時有効化
const shouldEnableSocialProviders = env.isProduction || env.useRealAuth;
const socialProviders = shouldEnableSocialProviders
  ? {
      google: { clientId, clientSecret },
      github: { clientId, clientSecret },
    }
  : undefined;

// メール/パスワード認証は ENABLE_EMAIL_AUTH フラグで制御
emailAndPassword: {
  enabled: env.isEmailAuthEnabled,
}
```

**セッション設定:**
```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7, // 7日
  updateAge: 60 * 60 * 24 * 1,   // 1日ごとに有効期限更新
}
```

#### ⚠️ 今後の調整ポイント

- **複数Google認証**: 現状OK。同じユーザーが複数のGoogle account でログイン可能な設計
- **プロバイダー削除** (unlinking): 未実装。後続の Phase 2 で実装必要
- **監査ログ**: Better Auth のセッション情報には記録されない。DB層で別途追跡が必要

---

### 2️⃣ DB スキーマの現状

**ファイル**: [src/lib/db/schema.postgres.ts](src/lib/db/schema.postgres.ts)

#### Better Auth 標準テーブル構造

```typescript
// users テーブル: ベースユーザー情報
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),  // ⚠️ 注: 1メール=1ユーザー
  emailVerified: boolean("email_verified"),
  image: text("image"),
  role: text("role"),
  // ...
});

// accounts テーブル: OAuth プロバイダー連携情報
export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),       // プロバイダーアカウントID
  providerId: text("provider_id").notNull(),     // 'google' | 'github' | 'email'
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  // ...
});

// sessions テーブル: セッション管理
export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  // ...
});
```

#### 💡 重要な発見

**現在の accounts テーブルの構造は、複数プロバイダーのリンクに対応可能:**

```
user (Better Auth 管理の基層ユーザー)
└─ accounts (複数行 OK)
   ├─ account: { provider_id: 'google', account_id: 'sub_value' }
   ├─ account: { provider_id: 'github', account_id: 'user_id_value' }
   └─ account: { provider_id: 'email', account_id: 'email_value' }
```

**ただし、以下が不足している:**

| 不足要素 | 必要性 | 用途 |
|--------|-------|------|
| **linked_providers** テーブル | 🔴 必須 | プロバイダーのメタデータ保存 (linkedAt, lastUsedAt等) |
| **provider_auth_history** テーブル | 🟡 推奨 | 認証イベント監査ログ |
| **root_account → linked_providers** 関連 | 🔴 必須 | ルートアカウントの複数認証履歴追跡 |

---

### 3️⃣ ルートアカウント管理の現状

**ファイル**: [src/lib/db/schema.postgres.ts](src/lib/db/schema.postgres.ts) (line 520~)

#### 現在の構造

```typescript
export const rootAccounts = pgTable("root_accounts", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  birthDate: date("birth_date"),
  gender: text("gender"),
  profileImageUrl: text("profile_image_url"),
  // ... その他フィールド
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

#### ⚠️ 現在のギャップ

```
user (Better Auth)
├─ accounts (複数プロバイダー管理)
└─ rootAccounts (1:1 関係)
    └─ ❌ リンク済みプロバイダーの履歴・ステータスなし
       └─ ❌ 「last_login_via_provider」などの追跡もなし
```

---

### 4️⃣ ログイン UI の現状

**ファイル**:
- [src/components/auth/social-login-buttons/social-login-buttons.tsx](src/components/auth/social-login-buttons/social-login-buttons.tsx)
- [src/components/auth/google-login-form/](src/components/auth/google-login-form/)
- [src/components/auth/github-login-form/](src/components/auth/github-login-form/)

#### 実装済みUI

```
┌─────────────────────────────────┐
│   ログイン画面                   │
├─────────────────────────────────┤
│                                 │
│  ┌──────────────────────────┐   │
│  │  🔵 Googleでログイン     │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │  🐙 GitHubでログイン     │   │
│  └──────────────────────────┘   │
│                                 │
│  エラーメッセージ表示            │
│  （getOAuthErrorInfo利用）      │
│                                 │
└─────────────────────────────────┘
```

#### ✅ コンポーネント構成

```typescript
// 1. SocialLoginButtons: ボタン群
<SocialLoginButtons className="..." />
  ├─ Google ボタン (signIn.social({ provider: 'google' }))
  ├─ GitHub ボタン (signIn.social({ provider: 'github' }))
  └─ エラーハンドリング

// 2. GoogleLoginForm / GitHubLoginForm: 単一プロバイダー用
<GoogleLoginForm mode="login|signup" />
```

#### ⚠️ 今後の拡張ポイント

**新しいUI が必要:**
- **アカウント設定画面 > 認証方法管理** (新規)
  - リンク済みプロバイダー一覧表示
  - プロバイダー追加ボタン
  - プロバイダー削除ボタン
  - 最終ログイン日時表示

---

### 5️⃣ セッション管理の現状

**ファイル**: [src/lib/auth/helper.ts](src/lib/auth/helper.ts)

#### ✅ 実装済み機能

```typescript
// 1. キャッシュ付きセッション取得 (React.cache)
export const getSession = cache(async () => {
  // 同一リクエスト内では DB アクセス 1回のみ
  const betterAuthResult = await serverAuth.api.getSession({ headers });
  return betterAuthResult ?? null;
});

// 2. 現在のプロバイダーを特定
async function getPrimaryAuthProvider(userId: string): Promise<string> {
  // accountRecords から 'google' | 'github' | 'email' | 'anonymous' を判定
}

// 3. 開発時ダミー認証サポート
if (isDevelopmentDummyAuthEnabled(cookie)) {
  return createDummySessionWithActiveProfile(...);
}
```

#### 💡 プロバイダー優先度ルール

```
OAuth (Google/GitHub) > Anonymous > Email
└─ 同じカテゴリなら last_used_at が新しい順
```

**現在の問題**: 複数Google account がある場合、どちらを "primary" とするかの判定ロジックが未実装。

---

### 6️⃣ API ミドルウェアの現状

**ファイル**:
- [src/lib/api/middleware/auth.ts](src/lib/api/middleware/auth.ts) - 認証チェック
- [src/lib/api/middleware/auth-session.ts](src/lib/api/middleware/auth-session.ts) - セッション取得
- [src/lib/api/middleware/rbac.ts](src/lib/api/middleware/rbac.ts) - RBAC チェック

#### ✅ 実装済み

```typescript
// 1. requireAuth: 認証必須
app.use('/api/protected/*', requireAuth, handler);

// 2. optionalAuth: 認証オプション
app.use('/api/public/*', optionalAuth, handler);

// 3. requireInteraction: インタラクション許可チェック
app.post('/posts', requireInteraction, async (c) => { ... });
```

---

## 🎯 Phase 1 実装の前提条件

### ✅ 実装済みで利用可能な機能

1. **Google/GitHub OAuth** - プロバイダー設定完了
2. **Better Auth セッション管理** - キャッシュ付きで効率的
3. **API ミドルウェア** - 認証チェック基盤完備
4. **accounts テーブル** - 複数プロバイダー保存可能な構造

### ❌ 新規実装が必須

1. **linked_providers テーブル** - プロバイダーメタデータ管理
2. **provider_auth_history テーブル** - 監査ログ
3. **ルートアカウント設定UI** - プロバイダー管理画面
4. **linkProviderToAccount サーバーアクション** - リンク処理
5. **複数プロバイダー判別ロジック** - 複数Google識別

---

## 📋 推奨実装順序（次のステップ）

### **Phase 1A: DB スキーマ拡張（1週間）**

```bash
# ✅ Step 1: linked_providers テーブル作成
# ✅ Step 2: provider_auth_history テーブル作成
# ✅ Step 3: マイグレーション生成・テスト
pnpm db:generate
pnpm db:push
```

**参照ルール:**
- `.agents/rules/database-schema.md` (設計)
- `.agents/rules/security-architecture.md` (RLS設定)

---

### **Phase 1B: サーバーアクション実装（1.5週間）**

```typescript
// ✅ Step 1: linkProviderToAccount action
// ✅ Step 2: unlinkProvider action
// ✅ Step 3: getLinkedProviders query
// ✅ Step 4: 監査ログ記録
```

**参照ルール:**
- `.agents/rules/server-action-error-handling.md` (例外設計)
- `.agents/rules/logging-rules.md` (監査ログ)

---

### **Phase 1C: UI コンポーネント実装（1周間）**

```
src/components/account-settings/
├─ linked-providers-manager.tsx (新規)
├─ provider-card.tsx (新規)
├─ add-provider-dialog.tsx (新規)
└─ remove-provider-dialog.tsx (新規)
```

---

## 🔐 セキュリティ上の留意点

### Current State

| 観点 | 現状 | リスク | 対策 |
|------|------|--------|------|
| **プロバイダー検証** | ⚠️ 部分的 | 偽のプロバイダーアカウント登録 | リンク時にプロバイダー署名検証 |
| **CSRF保護** | ✅ 実装済み | N/A | Better Auth が自動処理 |
| **セッション有効期限** | ✅ 7日 | N/A | OK |
| **RLS (Row Level Security)** | ✅ 実装済み | N/A | users テーブルで auth_user_id 制御 |
| **プロバイダーアンリンク** | ❌ 未実装 | 不要なプロバイダー削除不可 | **Phase 1B で実装** |

---

## 📞 次のアクション

1. **[この監査レポートを確認](.)** - 実装状況把握
2. **DB スキーマ設計** - `linked_providers`, `provider_auth_history` テーブル定義
3. **マイグレーション実装** - drizzle-kit generate
4. **サーバーアクション実装** - linkProviderToAccount から開始
5. **UI 実装** - 認証方法管理画面

---

## 💡 Tips & 関連アドバイス

### 複数Google認証への対応

```typescript
// ⚠️ 現在: primary を決める際に "最初のGoogleアカウント" を選定
// ✅ 改善: providerEmail を比較して正確に判定

// 例: personal@gmail.com と work@gmail.com の区別
const personalGoogle = linkedProviders.find(
  (p) => p.provider === 'google' && p.providerEmail === 'personal@gmail.com'
);
const workGoogle = linkedProviders.find(
  (p) => p.provider === 'google' && p.providerEmail === 'work@gmail.com'
);
```

### Email OTP リンクの事前検討

現在の `accounts` テーブルは Email プロバイダーにも対応可能。
Phase 1 の設計で Email OTP 追加を見据えたスキーマにしておくと、後続の Phase 2 での実装が楽。

### マイナンバーカード対応の参考

本レポートには含まれていませんが、将来マイナンバーカード対応を検討する際は、
`linked_providers.provider` に 'mynumber_card' を追加するだけで技術的には対応可能。
ただし法的・セキュリティ面での追加対策が必須。

---

**作成者**: GitHub Copilot
**レビュー**: 実装開始前に `.agents/rules/` ルール群を参照して承認してください
