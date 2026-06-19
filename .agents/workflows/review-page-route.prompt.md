---
description: App Routerのページ起点で依存を展開し、1ページ単位で厳格レビューする
---

# Page Route Review Workflow

このワークフローは、Next.js App Router の 1ページを起点に、依存ファイルを展開してレビューします。
ページ単位レビューを標準化し、レビュー範囲のブレを防ぐために使用します。

## 使いどころ

- 特定ページだけを安全にレビューしたい
- ページ配下のUI、ロジック、API境界をまとめて確認したい
- PR全体ではなく、画面単位で品質を担保したい

## 入力フォーマット（必須）

次の3項目を必ず受け取って開始します。

1. 起点（必須）
   - `起点ページ` または `URL` のどちらかを指定
   - 例1: 起点=src/app/settings/profile/page.tsx
   - 例2: URL=/home
   - 例3: URL=http://localhost:3000/home
2. レビュー観点（必須）
   - 例: セキュリティ、バグ、パフォーマンス、可読性、エラーハンドリング
3. 除外範囲（任意）
   - 例: テストファイルの any は低優先、文言のみ変更は除外

## URL指定の正規化ルール（必須）

URL 指定を受け取った場合は、必ず次の順で内部正規化してからレビューを開始します。

1. URL から `pathname` と `searchParams` を抽出する
   - 例: `http://localhost:3000/onboarding?stage=details` -> pathname=`/onboarding`, searchParams=`stage=details`
2. `pathname` を `src/config/routes.ts` の ROUTES 定数へ対応付ける
   - 例: `/home` -> `ROUTES.HOME`
3. ROUTES と実ルート構成から、起点となる `src/app/**/page.tsx` を確定する
4. 以降の依存展開とレビューは、確定した `page.tsx` を起点に実行する

補足:

- `localhost` のホスト名・ポート番号はレビュー範囲決定には使わない
- クエリで挙動が変わるページは `searchParams` をレビュー前提に含める
- URL から一意に起点ページを特定できない場合は、候補を列挙して確認する

## 対象範囲の決定ルール

正規化後に確定した起点ページから import を再帰的に辿り、次を対象に含めます。

- src/components 配下の依存
- hooks と logic ファイル
- actions / server actions
- validation schema
- API route（src/app/api, src/lib/api）
- 認証・認可境界（src/lib/auth, middleware, env）

次は原則除外します（必要時のみ確認）。

- 無関係な別ページ
- サンプル・検証用の未使用コード

## 実行手順

1. code-review スキルの手順に従い、参考資料を先に読む
2. analyze.py を対象ファイル群へ実行し、⚠️付き項目を優先確認
3. 重大度順（🔴/🟡/🟢）でレビュー指摘を作成
4. 各指摘にファイル:行番号と修正コード例を付与
5. 最後にカテゴリ別サマリー表と自己評価を出力

## analyze.py 実行ルール

- 対象は単一ファイルではなく、ページ依存で抽出したファイル群
- 優先順位は risk_score と risk_priority を使用
- todo_count, auth_boundary_todo, empty_catch, any_count を優先調査

## 出力要件

- 事実ベースで記述（推測禁止）
- 重要度を明示（🔴高 / 🟡中 / 🟢低）
- 問題箇所（ファイル名:行番号）を明示
- 具体的な修正コード例を提示
- カテゴリ別サマリーを付与
- 自己評価スコア（見落としリスク 低/中/高）を付与

## 使用例

- /review-page-route 起点=src/app/settings/profile/page.tsx 観点=セキュリティ,バグ,エラーハンドリング
- /review-page-route 起点=src/app/onboarding/page.tsx 観点=全カテゴリ 除外=文言のみ変更
- /review-page-route URL=/home 観点=セキュリティ,バグ
- /review-page-route URL=http://localhost:3000/onboarding?stage=details 観点=全カテゴリ
