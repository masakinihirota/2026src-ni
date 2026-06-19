---
name: db-antipattern-parallel-check
description: DBアンチパターン25項目をサブエージェントで並列監査し、現行スキーマ実装との整合チェックまで実施するスキル。
context: fork
---

# DB Antipattern Parallel Check

DBアンチパターン監査を、並列実行で高速かつ網羅的に行うためのスキルです。

## 1. 適用シーン

- 「DBアンチパターンを全部チェックしたい」
- 「現在のスキーマと実装がずれていないか確認したい」
- 「本番前にDBの構造的リスクを短時間で把握したい」

## 2. 監査の実行方式

必ず次のオーケストレーターを使用します。

- 3_db-antipattern-orchestrator

このオーケストレーターは次の6サブエージェントを同時起動します。

- db-logical-reviewer
- db-physical-reviewer
- db-query-reviewer
- db-app-reviewer
- db-migration-guard
- db-current-schema-reviewer

## 3. カバレッジ定義

### 3.1 論理設計

- Jaywalking
- Naive Trees
- ID Required
- Keyless Entry
- EAV
- Polymorphic Associations
- Multi-Column Attributes
- Metadata Tribbles

### 3.2 物理設計

- Rounding Errors
- 31 Flavors
- Phantom Files
- Index Shotgun

### 3.3 クエリ

- Fear of the Unknown
- Ambiguous Groups
- Random Selection
- Poorman's Search Engine
- Spaghetti Query
- Implicit Columns

### 3.4 アプリ統合

- Readable Passwords
- SQL Injection
- Pseudokey Neat Freak
- See No Evil
- Diplomatic Immunity
- Magic Beans
- 外部キーの誤用

合計で25アンチパターンを監査対象とします。

## 4. 追加で必ず行う整合監査

db-current-schema-reviewer により、次を確認します。

- schema と migration の整合
- migration と journal の整合
- relation / FK / index の整合
- enum / nullability / validation の整合
- 破壊的変更の安全策

## 5. 実行プロトコル

1. 対象スコープを確定する（既定は vns-masakinihirota）
2. 6サブエージェントを並列起動する
3. 指摘を重複排除して重大度順に統合する
4. 読み込み済みアンチパターン種類数を算出する
5. 全25項目のチェック完了可否を true/false で判定する
6. Current Schema Check Sheet を出力する
7. 修正要求がある場合のみ最小差分で修正する

## 6. レポートフォーマット

```markdown
## DBアンチパターン統合レビュー結果

### 監査サマリー
- 実行方式: 6サブエージェント並列
- カバレッジ: 25/25 + Current Schema Check

### カバレッジ検証
- 読み込み済みアンチパターン種類数: [N]
- 期待アンチパターン種類数: 25
- 全件チェック完了: true/false
- 未チェック項目: [name1, name2]（なければ []）

### 検出されたアンチパターン（重大度順）
1. [Critical] ...
2. [High] ...

### Current Schema Check Sheet
- schema と migration が一致している: OK/NG
- migration と journal が一致している: OK/NG
- FK/index/constraint が実装に一致している: OK/NG
- nullability / enum / validation が一致している: OK/NG
- 破壊的変更に安全策がある: OK/NG

### 推奨アクション
- Critical: 即時対応
- High: リリース前対応
- Medium/Low: 継続改善
```

## 7. 完了定義

- 6サブエージェントの結果が揃っている
- 25アンチパターンの評価が完了している
- 読み込み済み種類数が25である
- 全件チェック完了が true である
- Current Schema Check Sheet が埋まっている
- 優先度付きアクションが提示されている
