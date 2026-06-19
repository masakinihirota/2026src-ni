# DB Antipattern Parallel Check - Agent Instructions

## 目的

DBアンチパターンを全領域で並列監査し、現在のDB実装・スキーマ整合まで一括で評価する。

## このスキルを使う場面

- DBのアンチパターンをまとめてチェックしたい
- スキーマと実装のズレを短時間で監査したい
- リリース前にDB起因の事故リスクを棚卸ししたい

## 必須ルール

1. 監査は必ず並列実行で行う
2. 25アンチパターンを網羅する
3. schema / migration / journal / query usage の整合を確認する
4. 指摘は重大度順で出力する
5. 高リスク変更は提案止まりにする
6. 読み込み済みアンチパターン種類数を必ず出力する
7. 全件チェック完了を true/false で必ず出力する

## 並列実行対象サブエージェント

- db-logical-reviewer
- db-physical-reviewer
- db-query-reviewer
- db-app-reviewer
- db-migration-guard
- db-current-schema-reviewer

## 最低限の出力

- 統合サマリー
- カバレッジ検証（読み込み済み種類数 / 全件チェック完了 / 未チェック項目）
- 重大度順の問題一覧
- Current Schema Check Sheet
- 修正優先度（Critical / High / Medium / Low）
