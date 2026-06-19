---
description: 設計ドキュメント（Source vs Agent Rules vs AI-Design）の同期を実行します
---

# /sync-design ワークフロー

## 概要

人間が作成した `anti-design` とエージェントの行動指針 `.agents/rules` をチェックし、`ai-design` フォルダのドキュメントを最新化します。

## 手順

### 1. 更新状況の確認

`anti-design` と `.agents/rules` の各ファイルをリストアップし、最終更新日時を確認します。
// turbo

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
$designCandidates = @(
	"u:\2026src\vns-masakinihirota-design",
	"u:\2026src\vns-masakinihirota-design.worktrees\anti-design"
);
$rulesCandidates = @(
	"u:\2026src\vns-masakinihirota\.agents\rules",
	"u:\2026src\vns-masakinihirota.worktrees\anti\.agents\rules"
);
$designPath = $designCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1;
$rulesPath = $rulesCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1;
if (-not $designPath -or -not $rulesPath) {
	throw "sync-design: required paths not found. designPath=$designPath rulesPath=$rulesPath"
}
Get-ChildItem -Path $designPath, $rulesPath -Recurse |
	Select-Object FullName, LastWriteTime |
	Sort-Object LastWriteTime -Descending
```

### 2. 同期スキルの適用

変更があったファイルに関連する `ai-design` ドキュメントを特定し、`ai-design-sync` スキルを適用して更新します。

- `.agents/rules` 変更時 -> 設計・運用ガイドラインを再同期
- `anti-design` 変更時 -> 要件定義・技術設計を再同期

### 3. 整合性チェックと報告

// turbo

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
ls -R "u:\2026src\vns-masakinihirota-ai-design"
```

更新された内容を `walkthrough.md` に追記し、ユーザーに変更点を報告してください。

## 使用例

ユーザーから「設計書の同期をお願い」と言われた場合や、定期的なメンテナンス時に使用します。
