---
description: Hono API 実装時に、Route Handler直書き回避・ミドルウェア適用・型安全・最小検証を点検する
---

# Hono API Implementation Check Hook

Hono API を追加・更新した場合は、以下を必ず実行してください。

## トリガー条件

- `src/lib/api/routes/**` を追加・更新したとき
- `src/lib/api/middleware/**` を追加・更新したとき
- `src/app/api/[[...route]]/route.ts` を更新したとき
- `/api/*` の新規実装や Server Actions から API 化を行うとき

## 1. 事前確認

1. `.agents/skills/hono-api-implementation/SKILL.md` を開く。
2. `.agents/decisions/error-response-spec.md` のレスポンス形式を確認する。
3. `.agents/decisions/rbac-middleware-strategy.md` の権限制御方針を確認する。

## 2. 実装チェック

- Route Handler 直書き（`src/app/api/**/route.ts` の個別実装）を追加していない。
- ルート実装は `src/lib/api/routes/` に集約されている。
- 変更系エンドポイント（POST/PATCH/DELETE）に CSRF 保護を適用している。
- 必要な権限境界に RBAC middleware を適用している。
- 入力は Zod バリデーションを通してから使用している。
- レスポンスが `success: true/false` 形式に準拠している。

## 3. AI向け実装ガード

- API追加時は `schema -> service -> route -> router登録 -> test` の順で作業する。
- 例外処理はルート内で握り潰さず、共通 error handler へ委譲する。
- クライアント利用がある場合、RPC Client の型推論を壊さないよう既存 `AppType` の更新を確認する。

## 4. Hono x Inertia を参考にする場合（任意）

- `sample/hono/hono inertia.md` を参照し、`c.render` 駆動の設計意図を理解する。
- 本プロジェクトの既定（Next.js App Router + Hono API）と矛盾しない範囲で、設計比較の資料として利用する。

### Inertia活用チェック（必要時のみ）

- 画面遷移とデータ取得をサーバー主導へ寄せる価値があるかを確認した。
- `useEffect + fetch + useState` を減らす具体的な対象画面を特定した。
- zod を型・実行時検証・エラーメッセージの単一情報源として扱う設計にできるか確認した。
- 既存の Next.js App Router 境界を壊さないか（または段階移行計画があるか）を確認した。

## 5. 変更後の最小検証

```powershell
pnpm build
```

必要に応じて、関連APIテストを `pnpm test:file -- <対象テスト>` で実行する。
