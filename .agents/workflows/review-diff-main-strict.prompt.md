---
description: mainブランチからの全差分（未コミット含む）の厳格なコードレビュー
---

# Code Review: Diff from Main (Strict)

このワークフローは、現在のブランチで追加・変更されたすべてのコード（コミット済みおよび未コミット）と `main` ブランチの差分を、**厳密なセキュリティ・アーキテクチャ基準**および**コーディング規約**に沿って徹底的にレビューします。

## 手順

1.  **差分の取得**:
    - 新規ファイルが差分に含まれるよう、必要に応じて `git add -N .` を実行します。
    - PowerShellで `git diff $(git merge-base main HEAD)` を実行し、`main` との分岐点からの全差分を取得します。

2.  **厳格な評価基準の確認**:
    - レビューの際、必ず `.agents/rules/strict-review-standards.md`, `.agents/rules/security-architecture.md`, `.agents/rules/coding-standards.md` の内容を念頭に置いてください。

3.  **厳格なレビュー実行 (一切の妥協なし)**:
    - **セキュリティ・アーキテクチャ (Critical)**:
      - OAuth credentials等の環境変数について起動時検証（Empty String Fallback の禁止 等）が実装されているか。
      - 本番環境での認証バイパス (`USE_REAL_AUTH=false`) が漏れ出す可能性を完全にブロックしているか。
      - Server Actions は原則として REST API に置き換えられているか、または暗黙のRPCとして悪用されていないか。
      - DBアクセスは `camelCase`（TypeScript）と `snake_case`（DB物理名）の境界が守られているか。
    - **データベースとRLS (Major/Critical)**:
      - すべての対象テーブルで RLS が有効化されているか。
      - `.with()` 等で Eager Loading され、N+1クエリが防がれているか。
      - 外部キーや検索頻度が高いカラムにインデックスが貼られているか。
      - タイムスタンプに `withTimezone: true` が指定されているか。
    - **Next.js 16 固有仕様 (Major)**:
      - 非同期API (`await params`, `await cookies()`) が正しく使われているか。
      - `middleware.ts` ではなく `src/proxy.ts` が利用され、Edge Runtime制約が守られているか。
      - `revalidateTag()` に第2引数（cacheLifeプロファイル）が指定されているか。
    - **エラーハンドリングとログ (Major)**:
      - ログに `console.*` が使われていないか（`logger.*` を使用しているか）。
      - エラーを Silent Failure にせず、具体的なスタックトレースやコンテキストを記録しているか。
      - セキュリティイベントに対するログ記録があるか。
    - **テストとUI品質 (Critical)**:
      - TDD原則に従い、追加されたロジックに対応するテストコードが存在するか。
      - UIコンポーネント（アクセシビリティ標準）として、`vitest-axe` 検証がテストに含まれているか。

4.  **レポート作成**:
    - 検出された問題を深刻度（Critical, Major, Minor）と共に明確にリストアップし、容赦なく指摘します。
    - セキュリティ上のリスクや重大なアーキテクチャ違反（Blocker）がある場合は、修正必須項目として強めの警告と具体的な修正コードを提示し、タスク完了をブロックしてください。
