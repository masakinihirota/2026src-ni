---
name: auth-rls-boundary-hardening
description: Better AuthとRLSの境界を強化し、fail-fast設定・入力検証・監査ログ・最小回帰テストで再発防止するスキル。
context: fork
---

# Auth RLS Boundary Hardening

認証層とRLS境界で起きる重大事故を未然に防ぐためのスキルです。

## 1. 適用シーン

- Better Authのセッション情報をDBコンテキストへ橋渡ししている
- app.auth_user_id などのセッション変数をDB側へ設定している
- OAuth設定やtrusted originsを環境変数で管理している
- 認証失敗時の観測性が弱く、監査ログが不足している

## 2. 検出ルール

### 2.1 認証設定

- 本番でのデフォルト資格情報フォールバックを禁止
- secret / clientId / clientSecret 未設定時に fail-fast する
- trustedOrigins と baseURL の不整合を禁止

### 2.2 RLS文脈

- authUserId の未検証設定を禁止
- 空文字、null、undefined を app.auth_user_id に設定しない
- リクエスト毎にRLSコンテキストを明示的に初期化する

### 2.3 監査ログ

- セッション取得失敗を無視しない
- path, method, ip などの最小文脈を必ず記録する
- logger を使い、console 直接出力は行わない

## 3. 修正テンプレート

### 3.1 テンプレートA: OAuth fail-fast

```typescript
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

if (!googleClientId || !googleClientSecret) {
  throw new Error("GOOGLE OAuth credentials are required")
}
```

### 3.2 テンプレートB: RLS入力検証

```typescript
if (typeof authUserId !== "string" || authUserId.trim() === "") {
  throw new Error("authUserId must be a non-empty string")
}

await tx.execute(sql`select set_config('app.auth_user_id', ${authUserId}, true)`)
```

### 3.3 テンプレートC: 認証失敗の監査ログ

```typescript
logger.warn("auth_session_failed", {
  path: request.nextUrl.pathname,
  method: request.method,
  ip: request.headers.get("x-forwarded-for") ?? "unknown",
})
```

## 4. 最小回帰テスト例

```typescript
import { describe, expect, it } from "vitest"
import { setRlsContext } from "../rls-context"

describe("RLS context validation", () => {
  it("authUserIdが空文字のときエラーを投げる", async () => {
    await expect(setRlsContext({ authUserId: "" })).rejects.toThrow(
      "authUserId must be a non-empty string"
    )
  })

  it("authUserIdが有効文字列のとき設定される", async () => {
    await expect(setRlsContext({ authUserId: "user_123" })).resolves.toBeDefined()
  })
})
```

## 5. 運用手順

1. 失敗条件を1件に絞ってテストを先にRED化
2. fail-fast / 検証 / ログのどこが欠落かを特定
3. 最小テンプレートでGREEN化
4. 近接境界（auth設定・middleware・db context）を横展開点検

## 6. 完了定義

- 本番資格情報のフォールバックが消えている
- RLS設定前のauthUserId検証が必須化されている
- 認証失敗が監査ログに残る
- 最小回帰テストがグリーン
