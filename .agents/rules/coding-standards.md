---
trigger: always_on
---

# Coding Standards

コード品質、型安全性、およびビルド安定性を保つための技術的基準です。

## 共通テンプレート

### 目的
- 型安全性・命名規則・ビルド安定性の基準を統一する。

### 必須
- `any` を原則禁止し、必要時は理由を明記する。
- DB物理スキーマは `snake_case`、アプリ正規キーは `camelCase` を守る。
- 完了前にビルドを実行して整合性を確認する。

### 禁止
- 根拠のない `any` 使用。
- アプリ内部正規キーとしての `snake_case` 利用。

### 例外
- 外部ライブラリ都合などで `any` が必要な場合のみ、コメントで理由を明記して許容する。

### 参照
- [セキュリティ・アーキテクチャ](./security-architecture.md)
- [厳格なコード審査基準](./strict-review-standards.md)

## 1. TypeScript Immutability (不変性)

コンパイル時の安全性とDXのバランスを考慮し、以下の基準で型定義を行ってください。

- **Level 2 (`as const`)**: 静的な定数、設定値、マスタデータには必ず `as const` を使用する。
  ```typescript
  export const NAV_ITEMS = [{ label: "Home", href: "/" }] as const;
  ```
- **Level 1 (`readonly`)**: コンポーネントのPropsやデータ受け渡しには `readonly` 修飾子を使用する。
- **禁止事項**: `Object.freeze` (実行時コスト) や `DeepReadonly` (複雑すぎ) は使用しない。

## 2. TypeScript Typing (`any` vs `unknown`)

TypeScriptの型安全性を最大限に高めるため、以下の原則を徹底してください。

- **`any` の原則禁止**: 型チェックを無効化する `any` 型の使用は原則として禁止します。
- **`unknown` の使用**: 任意の型を受け入れる必要がある場合は、代わりに `unknown` を使用してください。
- **型ガードと検証**: `unknown` 型の値を使用する場合は、必ず `typeof` などの **型ガード (Type Guard)** や **Zod** 等による型検証 (バリデーション) を実装し、安全性を担保してから使用してください。
- 例外: 複雑なジェネリクスや外部ライブラリの型定義の不備で型解決が極めて困難な場合にのみ、最終手段として `any` を許容しますが、必ず `// eslint-disable-next-line @typescript-eslint/no-explicit-any` などのコメントを残し、理由を明記してください。

## 3. Build Stability (ビルド安定性)

- **事前のファイル確認**: import文を追加する前に、対象ファイルが存在することを必ず確認する。
- **依存関係の先行実装**: 新機能（Actionsなど）が必要な場合、参照する側のコードを書く前に、依存先のファイルを先に作成する。
- **完了前のビルドチェック**: タスク完了やレビュー依頼の前に、`npm run build` または `next build` を実行し、モジュール不足や型エラーがないことを保証する。

## 4. General Coding Rules

- **変数名**: 英語で分かりやすく命名する（ローマ字不可）。
- **Barrel Export**: `index.ts` を活用し、公開すべきものだけをエクスポートする。
- **ROROパターン**: 可能かつ適切な場合は、Receive an Object, Return an Object (RORO) パターンを使用する。
- **ファイルサイズと分割**: 1ファイルの行数は **500行以内** を目安とし、これを超える場合は責務を意識して適切にサブコンポーネントやロジックファイルに分割する。
- **名前付きエクスポート**: コンポーネントや関数は原則として名前付きエクスポート (`export const MyComponent = ...`) を使用し、デフォルトエクスポートはページなどフレームワークが要求する場合を除き避ける。

## 4.3 ルート定数利用ルール（再発防止）

- 画面遷移リンク、`redirect()`、`NextResponse.redirect()`、`router.push()`、`Link href` では、**ルート文字列の直書きを禁止**し、`src/config/routes.ts` の定数経由で指定する。
- 動的セグメントを含むパスは、`src/config/routes.ts` に集約したビルダー関数を利用する（例: value history のパス生成）。
- 旧互換ルートを扱う場合でも、呼び出し側は正規ルート定数を使用し、互換処理は `src/proxy.ts` 側に閉じ込める。
- 例外は、テストで意図的に不正/旧URLを検証するケースに限定する。

## 4.1 Naming Convention for Form/Data Keys (重要)

- **camelCase を唯一の正規キーとして使用すること。**
- **snake_case の新規追加・更新は禁止。**
- 後方互換が必要な場合でも、許可されるのは「読み取り互換」のみで、更新処理は必ず camelCase を使うこと。
- 互換レイヤーを設ける場合は、互換処理を1か所に集約し、アプリ本体は camelCase のみを参照すること。
- 互換期間終了後は snake_case の読み取り分岐を削除すること。

## 4.2 Naming Convention for DB / ORM Boundaries (重要)

- **DB物理スキーマは snake_case に統一すること。**
- 対象: テーブル名、カラム名、制約名、インデックス名、外部キー名。
- **Drizzle の TypeScript プロパティ名は camelCase を使用すること。**
- **TypeScript / React / Zod / API DTO の正規キーは camelCase に統一すること。**
- 旧 Supabase 由来の snake_case は、**互換レイヤーに限定して読み取りのみ許可**し、アプリ内部の正規キーとして使用しないこと。
- **DB物理名とアプリ内部キーを同じ記法に無理に統一しないこと。** DB層は snake_case、アプリ層は camelCase で責務分離すること。
- Drizzle のプロパティ名まで snake_case に寄せる変更は、既存の TypeScript / React / Zod / DTO 層へDB都合を波及させるため非推奨。

**推奨例（Drizzle）**:
```typescript
export const users = pgTable("user", {
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull(),
});
```

**非推奨例（Drizzle プロパティを snake_case にする）**:
```typescript
export const users = pgTable("user", {
  user_id: text("user_id").notNull(),
  created_at: timestamp("created_at").notNull(),
});
```

**禁止例**:
```typescript
onUpdate({ basic_values: value });
```

**推奨例**:
```typescript
onUpdate({ basicValues: value });
```

## 4.4 Client Component Boundary Rules (重要)

Next.js App Router では、React Hook を使う UI は Client Component 境界を明示しないと、`Ecmascript file had an error`（import trace付き）でビルド失敗する。

- **必須**: `useState` / `useEffect` / `useMemo` / `useRef` / `useContext` / `useReducer` / `useLayoutEffect` / `useTransition` / `useDeferredValue` / `useId` のいずれかを使う `*.tsx` は、先頭に `"use client";` を置く。
- **必須**: `"use client";` は import より前、ファイル先頭に配置する。
- **必須**: barrel (`index.ts`) 経由で Server Component から参照される可能性がある `view` 系ファイルは、Hook追加と同時に Client 指定を確認する。
- **必須**: Server Component (`page.tsx` など) は、必要がない限り Hook を含む `view` を直接 import せず、Container / Client境界コンポーネント経由で参照する。

### 変更時チェックリスト

- [ ] Hook を追加した `*.tsx` の先頭に `"use client";` がある
- [ ] `index.ts`（barrel）経由で Server 側から到達する import trace を確認した
- [ ] `pnpm build` で Next.js の Client/Server 境界エラーが出ない

## 5. Next.js 16 Specific Rules

### 5.1 Proxy (旧 Middleware) の命名規則

**重要**: Next.js 16からミドルウェアの命名規則が変更されました。

- ✅ **正しいファイル名**: `src/proxy.ts` または `proxy.ts` (ルートディレクトリ)
- ✅ **正しい関数名**: `export async function proxy(request: NextRequest)`
- ❌ **誤り**: `middleware.ts` や `export function middleware()` は **Next.js 16では非推奨**

**理由**:
- Express.jsのミドルウェアとの混同を避けるため
- ネットワーク境界の役割を明確化するため
- Next.js 15以前の`middleware.ts`は非推奨（将来のバージョンで削除予定）

**実装例**:
```typescript
// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // 認証・リダイレクトロジック
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
```

**マイグレーション**:
- 既存プロジェクトの場合、公式codemodが利用可能:
  ```bash
  npx @next/codemod@canary middleware-to-proxy .
  ```

**参考**: [Next.js 16 公式ドキュメント - Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)

### 5.2 Async Request APIs（非同期API必須化）

**重要**: Next.js 16では、リクエスト関連のAPIがすべて非同期化されました。

#### params と searchParams の非同期化

- ✅ **正しい書き方**: `await params` / `await searchParams`
- ❌ **誤り**: 同期的アクセス `params.id` は **Next.js 16でエラー**

**実装例**:
```typescript
// app/blog/[slug]/page.tsx
export default async function BlogPost({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params; // ✅ awaitが必須
  const { tag } = await searchParams; // ✅ awaitが必須

  return <article>...</article>;
}
```

#### cookies(), headers(), draftMode() の非同期化

- ✅ **正しい書き方**: `await cookies()` / `await headers()` / `await draftMode()`
- ❌ **誤り**: 同期的アクセスは **Next.js 16でエラー**

**実装例**:
```typescript
import { cookies, headers, draftMode } from "next/headers";

export async function GET() {
  const cookieStore = await cookies(); // ✅ awaitが必須
  const headersList = await headers(); // ✅ awaitが必須
  const { isEnabled } = await draftMode(); // ✅ awaitが必須

  const token = cookieStore.get("token");
  const userAgent = headersList.get("user-agent");

  return Response.json({ token, userAgent, draftMode: isEnabled });
}
```

**マイグレーション**:
```bash
# params/searchParamsの自動変換
npx @next/codemod@canary next-async-request-api .
```

### 5.3 revalidateTag() の第2引数必須化

**重要**: Next.js 16では、`revalidateTag()`に第2引数（cacheLifeプロファイル）が必須です。

> ⚠️ **注意**: 本セクションはプレリリース情報に基づきます。正式リリース後に公式ドキュメントで内容を検証してください。

- ✅ **正しい書き方**: `revalidateTag(tag, cacheLifeProfile)`
- ❌ **誤り**: `revalidateTag(tag)` のみは **非推奨**

**実装例**:
```typescript
import { revalidateTag } from "next/cache";

// ✅ 推奨: 組み込みプロファイル 'max' を使用（ほとんどのケースに最適）
revalidateTag("blog-posts", "max");

// ✅ その他の組み込みプロファイル
revalidateTag("news-feed", "hours");
revalidateTag("analytics", "days");

// ✅ カスタム有効期限（秒単位）
revalidateTag("products", { expire: 3600 });

// ❌ 非推奨: 第2引数なし
revalidateTag("blog-posts");
```

**新API `updateTag()` と `refresh()` の使い分け**:

- **`revalidateTag(tag, profile)`**: 静的コンテンツをバックグラウンドで再検証（stale-while-revalidate）
- **`updateTag(tag)`**: Server Actions専用。即座にキャッシュを破棄して最新データを取得（read-your-writes）
- **`refresh()`**: Server Actions専用。キャッシュされていないデータのみ更新

**実装例**:
```typescript
"use server";
import { updateTag, refresh } from "next/cache";

// updateTag: ユーザーが変更をすぐに見る必要がある場合
export async function updateUserProfile(userId: string, profile: Profile) {
  await db.users.update(userId, profile);
  updateTag(`user-${userId}`); // ✅ 即座に反映
}

// refresh: キャッシュされていない動的データの更新
export async function markNotificationAsRead(notificationId: string) {
  await db.notifications.markAsRead(notificationId);
  refresh(); // ✅ 通知カウントなど、キャッシュされていないデータを更新
}
```

### 5.4 next/image の破壊的変更

**localパターンのクエリ文字列制限**:
- ローカル画像にクエリ文字列を使用する場合、`images.localPatterns`設定が必須（列挙攻撃の防止）

**minimumCacheTTL のデフォルト変更**:
- 新デフォルト: **4時間（14400秒）**（旧: 60秒）
- Cache-Controlヘッダーがない画像の再検証コストを削減

**imageSizes のデフォルト変更**:
- `16` がデフォルトサイズから削除（利用率4.2%）
- srcsetのサイズを削減し、APIバリエーションを削減

**qualities のデフォルト変更**:
- 新デフォルト: `[75]` のみ（旧: 1～100）
- `quality`プロップは最も近い値に丸められる

**セキュリティ強化**:
- `dangerouslyAllowLocalIP`: デフォルトで`false`（プライベートネットワークでのみ`true`に設定）
- `maximumRedirects`: デフォルトで3回まで（旧: 無制限）

### 5.5 Parallel Routes の default ファイル必須化

**重要**: すべてのパラレルルートスロットに明示的な`default`ファイル（`default.js` / `default.jsx` / `default.ts` / `default.tsx`）が必須です。

```
app/
├── @modal/
│   ├── default.tsx  ← ✅ 必須
│   └── login/
│       └── page.tsx
└── page.tsx
```

**実装例**:
```typescript
// app/@modal/default.tsx
import { notFound } from "next/navigation";

// 空のスロットを表示したくない場合
export default function Default() {
  return null;
}

// または404を表示する場合
export default function Default() {
  notFound();
}
```

**ビルドエラー**: `default`ファイルがない場合、ビルドが失敗します。

---

**参考**:
- [Next.js 16 公式アップグレードガイド](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16 リリースノート](https://nextjs.org/blog/next-16)

## 5. Strict Review Standards

レビュー「現在のアプリを厳しくレビューしてください」で指摘された内容に基づくコーディングルールです。

詳細は [Strict Review Standards](./strict-review-standards.md) を参照:

- **環境変数検証**: OAuth credentials、本番環境設定の起動時検証
- **Database Schema Rules**: RLS、インデックス戦略、タイムスタンプ型、N+1 対策
- **Error Handling & Logging**: エラーメッセージ詳細化、セキュリティイベント記録
- **Testing & TDD**: クリティカル機能のテスト必須化

特に以下は **Critical** レベルの誤りです:

- OAuth credentials の空文字列フォールバック
- 本番環境でのダミー認証有効化
- RLS ポリシーなしでの個人情報テーブル公開
- エラー情報の無視

## 6. React Compiler Operational Rules

React 19 + Next.js 16 環境での再レンダー最適化方針を統一するため、以下を必須ルールとします。

### 6.1 基本方針（推奨A）

- `next.config.ts` の `reactCompiler: true` を維持し、無効化を行わない。
- 新規実装では、性能目的だけの `useMemo` / `useCallback` / `React.memo` を安易に追加しない。
- 既存の手動メモ化は一括削除しない。挙動互換を確認しながら段階的に整理する。

### 6.2 例外（明示許可）

以下は React Compiler 有効時でも許可する。

- 正しさのための実装（例: Effect 依存安定化、stale closure 回避）。
- ライブラリ境界や外部API契約で参照安定性が必要な箇所。
- 計測結果に基づき、手動メモ化が有意に有効と確認できた箇所。

### 6.3 デバッグ手順

- Compiler 起因が疑われる不具合は、対象コンポーネントに一時的に `"use no memo"` を適用して切り分ける。
- 問題解消後は根本原因（Rules of React 違反や参照同値性依存）を修正し、`"use no memo"` を撤去する。
- 「メモ化に依存しないと正しく動かない設計」を放置しない。

### 6.4 段階導入モードの扱い

- 全体有効運用を原則とし、`compilationMode: 'annotation'` は障害調査や限定検証の短期運用でのみ許可する。
- 恒久的な annotation モード固定は、明示合意がある場合に限る。

### 6.5 レビュー観点

- PRレビューでは「手動メモ化の追加理由」を確認し、性能最適化目的のみなら再検討する。
- `setState` は可能な限り functional update を優先し、正しさと安定性を担保する。
- React DevTools と計測値を併用し、体感のみで最適化判断しない。

## 7. React State Updater 純粋性ルール

React の `setState(fn)` 更新関数は**純粋関数**であることが必須です。Ref・外部変数の読み書きなど副作用は updater の外で行うことを厳格に要求します。

### 7.1 必須ルール

- `setState((prev) => newState)` の更新関数内では、**副作用を返す以外のすべての操作を禁止**します。
- **副作用の定義**:
  - Ref読み取り・書き込み（`ref.current = ...`, `ref.current?.` アクセス）
  - 外部変数・グローバル変数への読み書き
  - 関数呼び出し（ただし参照等式に影響しない計算は許可）
  - Date.now()、Math.random()などの非決定的操作

### 7.2 禁止例（React Strict Mode で二重呼び出しを引き起こす）

```typescript
// ❌ 禁止: updater内でrefをクリア
setFormData((previous) => {
    const targetIndex = pendingCandidateIndexReference.current;  // ❌ ref読み取り
    pendingCandidateIndexReference.current = null;              // ❌ ref書き込み

    updatedCandidates[targetIndex] = newCandidate;
    return { ...previous, zodiacCandidates: updatedCandidates };
});
```

**問題点**:
- Strict Mode では updater が2回呼ばれる
- 1回目: ref = newIndex → null にセット → 正しくスロット newIndex に代入
- 2回目: ref = null → フォールバック値にセット → 不正なスロットに代入 ← 採用される
- 開発時のみ発現するため、本番バグの原因になりやすい

### 7.3 推奨パターン（updater外で副作用を処理）

```typescript
// ✅ 推奨: updater外でref読み取り・クリア
const capturedTargetIndex = pendingCandidateIndexReference.current;  // ✅ updater外で読み取り
pendingCandidateIndexReference.current = null;                      // ✅ updater外でクリア

setFormData((previous) => {
    const targetIndex: 0 | 1 | 2 =
        capturedTargetIndex ?? (activeCandidate !== null ? activeCandidate : 0);

    updatedCandidates[targetIndex] = newCandidate;
    return { ...previous, zodiacCandidates: updatedCandidates };
});
```

### 7.4 Strict Mode の活用

- **開発環境では必ず React Strict Mode を有効**にしてテストします。
- Strict Mode の二重呼び出しで不具合が検出されたら、updater の純粋性を疑ってください。
- 開発環境でのみ発現するバグの **80% はこのルール違反が原因**です。

### 7.5 チェックリスト（PR レビュー時）

- [ ] `setState(fn)` 更新関数内にrefアクセスがないか確認
- [ ] 更新関数内に外部変数への読み書きがないか確認
- [ ] コミット前に Strict Mode 環境でテストしたか確認
- [ ] 必要に応じて新しいユニットテストを追加したか確認

## 8. DTO 変換関数の命名規約（境界追跡用）

DTO境界の追跡性を高めるため、UI向けの変換関数名は以下の3系統に統一する。

### 8.1 許可される命名パターン

- `to◯◯UiItems`: 配列を UI DTO 配列へ変換する関数
- `to◯◯UiItem`: 単一要素を UI DTO へ変換する関数
- `parse◯◯Response`: APIレスポンスを UI DTO にパースする関数

### 8.2 適用ルール

- 上記以外の命名（例: `normalize◯◯`, `format◯◯`, `map◯◯`）を DTO 境界の公開関数名として使わない。
- DTO変換の公開関数は `*.dto.ts` に配置し、UI側は `*.dto.ts` の公開関数のみを参照する。
- `*.dto.ts` 以外のファイルでは、生 API/DB 由来型を import しない（ESLint ルールに従う）。

### 8.3 例

```typescript
// 配列変換
export function toProfilesPageUiItems(profiles: readonly RawProfileItem[]): ProfilesPageUiItem[] {
  return profiles.map(toProfilesPageUiItem)
}

// 単一要素変換
export function toPublicProfileUiItem(raw: PublicProfileRecord): PublicProfileUiItem {
  // ...
}

// レスポンス変換
export async function parseActiveProfileSelectionResponse(response: Response): Promise<ActiveProfileSelection> {
  // ...
}
```

### 8.4 チェックリスト（PR レビュー時）

- [ ] DTO変換の公開関数名が `to◯◯UiItems` / `to◯◯UiItem` / `parse◯◯Response` のいずれかに一致している
- [ ] 既存の DTO 変換公開関数に `normalize◯◯` など規約外命名が追加されていない
- [ ] UI 層が `*.dto.ts` の公開関数経由でのみ変換結果を受け取っている
- [ ] DTO 境界外で生 API/DB 由来型を直接参照していない

### 8.5 段階展開戦略（他機能への適用時）

DTO命名チェックを `profile-display` 以外へ拡大適用する際は、以下の段階を踏む。

#### フェーズ1: 情報収集（導入前）

1. 対象ディレクトリの `*.dto.ts` ファイルを洗い出す
2. 既存の DTO 変換公開関数名を棚卸しし、規約外命名の割合を把握する
3. 必要に応じて既存コードをリネーム（例: `normalize◯◯` → `to◯◯UiItem`）

#### フェーズ2: Warn 導入（1～2週間観測）

1. `eslint.config.mjs` に対象ディレクトリ向け `no-restricted-syntax` を `warn` で追加
2. CI で警告が出ることを確認
3. 1～2週間の間に警告内容を分析し、真の違反数を把握

#### フェーズ3: Error 引き上げ（観測後）

1. Warn 期間中に警告が安定したこと、大量の false positive がないことを確認
2. チーム内で「今後このルールに従う」ことを明示的に合意
3. `eslint.config.mjs` で `warn` → `error` へ変更
4. 既存違反を放置しないよう、リネーム・修正を完了させてから切り替え

#### 例

```javascript
// フェーズ2（warn）
{
  files: ["src/components/values/**/*.dto.ts"],
  rules: {
    "no-restricted-syntax": [
      "warn",  // ← 1～2週間は警告のみ
      { /* selector and message */ }
    ]
  }
}

// フェーズ3（error）- 後続の段階で切り替え
{
  files: ["src/components/values/**/*.dto.ts"],
  rules: {
    "no-restricted-syntax": [
      "error",  // ← 観測確認後に error へ引き上げ
      { /* selector and message */ }
    ]
  }
}
```
