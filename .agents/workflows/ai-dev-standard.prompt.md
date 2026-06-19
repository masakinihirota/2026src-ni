---
description: 高優先のAI開発運用（並列レビュー、変更点限定テスト、テストアウトライン先行、修正+検証、設計同期）を標準実行します
---

# /ai-dev-standard ワークフロー

## 目的

以下の運用を1つの標準手順として固定し、見落とし削減と開発速度の両立を実現します。

- サブエージェント並列レビュー
- 変更点限定テスト運用
- テストアウトライン先行
- 提案止まり禁止（修正 + 検証まで）
- 設計書と実装の定期同期

## 適用シーン

- 大きめPR前
- 機能実装後の最終確認
- 1〜3ファイルの小〜中規模修正
- 新機能、仕様変更、バグ修正

## 標準手順

### 1. テストアウトライン先行（実装前）

`test-case-outline-generation` スキルを適用し、対象機能のテストを `describe + it.todo` で先に作成する。

- テストは原則コロケーション配置
- システム横断テストのみ `tests/` 配下

### 2. 実装（提案止まり禁止）

AIには必ず以下を1セットで依頼する。

- 修正実装
- 変更理由
- 最小回帰テスト追加
- 検証実行（テスト/型/ビルド）

### 3. 変更点限定テスト

変更点に直結するテストを優先実行する。

```powershell
pnpm test:changed
```

必要に応じて対象ファイルを明示して追加実行する。

```powershell
pnpm test:file -- <changed-test-1> <changed-test-2>
```

最終安全確認としてビルドを実行する。

```powershell
pnpm build
```

### 4. サブエージェント並列レビュー

次の観点を並列でレビューし、重大度順に統合報告する。

- `security-reviewer`
- `db-reviewer`
- `test-reviewer`
- `ui-ux-reviewer`
- `architecture-reviewer`

レビュー結果は Critical/High を最優先に対処する。

### 5. フック観測ログ確認

観測系フックログを確認し、失敗・ブロック要因を追跡可能にする。

- `logs/tool-results.jsonl`
- `logs/audit.jsonl`
- `logs/prompts.jsonl`

### 6. 設計同期（必須）

実装内容と合意事項を、必ず次の反映先へ同期する。

- `u:\2026src\vns-masakinihirota-ai-design\`

必要に応じて `sync-design` ワークフローを実行し、変更点を要約して記録する。

## 完了条件

- 変更点限定テストがグリーン
- build がグリーン
- 並列レビューの Critical/High が解消済み、または対応方針が明記済み
- `vns-masakinihirota-ai-design` 側に設計反映済み
