# Review Workflows Guide

レビュー系 workflow の使い分けガイドです。
重複していた review prompt を整理し、日常運用で使うものだけを残しました。
迷ったら、まず review-page-route を使ってください。

## 命名ルール

- review- で始まるファイルは、GitHub Copilot の slash command 用 workflow です
- 形式は `review-<対象>-<種別>.prompt.md` を基本とします
- 例:
  - `review-page-route.prompt.md`: ページ単位レビュー
  - `review-db-antipattern.prompt.md`: DBアンチパターンレビュー
  - `review-diff-main-strict.prompt.md`: main差分の厳格レビュー

## 現役で使う workflow

1. ページ単位で確認したい（review-page-route.prompt.md）
2. コア基盤・認証・APIを重点監査したい（review-security-core.prompt.md）
3. Webセキュリティを実践観点で厳格監査したい（review-security-web-check.prompt.md）
4. mainとの差分を厳格に監査したい（review-diff-main-strict.prompt.md）
5. 未コミット変更だけ確認したい（review-uncommitted.prompt.md）
6. DBアンチパターンだけ確認したい（review-db-antipattern.prompt.md）
7. テスト品質だけ確認したい（review-test-quality.prompt.md）
8. 文書だけ確認したい（review-writing.prompt.md）
9. パフォーマンスだけ確認したい（review-performance-audit.prompt.md）

## 用途別マップ

### A. 日常レビュー（通常）

- review-page-route.prompt.md
  - App Router の1ページを起点に依存展開してレビュー
  - 画面ごとの品質確認に最適

- review-security-core.prompt.md
  - 認証、API、DB、共通基盤を重点監査
  - インフラ寄りの変更に使う

- review-security-web-check.prompt.md
  - 徳丸本観点と実践チェックポイントを含むWebセキュリティ監査
  - IDOR、CSRF、XSS、SQLi、セッション、ログ運用まで広く確認

### B. 差分レビュー（変更確認）

- review-diff-main-strict.prompt.md
  - main 差分の厳格レビュー
  - リリース前、セキュリティ重視時に使用

- review-uncommitted.prompt.md
  - 未コミット変更だけを短時間レビュー

### C. 専門レビュー

- review-db-antipattern.prompt.md
  - DBアンチパターンの集中的監査

- review-test-quality.prompt.md
  - テスト品質・不足・脆さを確認

- review-performance-audit.prompt.md
  - パフォーマンス観点を優先監査

## 迷ったときの選択ルール

1. ページ1つが対象なら review-page-route
2. 認証・API・DB基盤なら review-security-core
3. IDOR/CSRF/XSS/SQLi を含むWeb脆弱性中心なら review-security-web-check
4. PRの最終ゲートなら review-diff-main-strict
5. コミット前の最終確認なら review-uncommitted

## 推奨運用（混乱しない形）

1. 開発中
   - review-page-route を実行
2. 仕上げ前
   - review-uncommitted を実行
3. PR前
   - review-diff-main-strict を実行

この3段だけで、日常運用は十分に整理できます。

## 退役した workflow と置き換え先

- review-feature-slice.deprecated.md
  - 理由: review-page-route と対象の切り方が近く、日常運用では使い分けコストが高い
  - 置き換え先: review-page-route

- review-ui-components.deprecated.md
  - 理由: review-page-route と review-test-quality で大半を代替できる
  - 置き換え先: review-page-route / review-test-quality

- review-diff-main-normal.deprecated.md
  - 理由: strict と二重管理になり、レビュー基準がぶれやすい
  - 置き換え先: review-diff-main-strict

- review-components-all.deprecated.md
  - 理由: 範囲が広すぎ、実務で重くなりやすい
  - 置き換え先: review-page-route

- review-changes-recent.deprecated.md
  - 理由: review-uncommitted と review-diff-main-strict で役割を吸収できる
  - 置き換え先: review-uncommitted / review-diff-main-strict

- review-db-general.deprecated.md
  - 理由: review-security-core と review-db-antipattern で実質代替可能
  - 置き換え先: review-security-core / review-db-antipattern
