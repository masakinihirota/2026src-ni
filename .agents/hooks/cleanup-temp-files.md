---
description: タスク完了時・コミット前に、AIが生成した一時ファイル（ログ・テスト出力・バックアップ等）をルートディレクトリから自動削除する
---

# AI一時ファイル クリーンアップ Hook

タスク完了時またはコミット前に、以下の手順を実行してください。

## トリガー条件

- タスクが完了し、ユーザーに報告する直前
- `/commit` ワークフロー実行時（品質チェックの前）

## 1. 対象ファイルの検出

プロジェクトルートディレクトリで以下のパターンに一致するファイルを検索してください：

| パターン | 例 |
|---|---|
| `*.log` | `build.log`, `lint_output.log`, `axe_crash.log` |
| `*_output*.txt` | `build_output.txt`, `test_output.txt` |
| `test-output.txt` | テスト出力 |
| `test_report.json` | テストレポート |
| `analyze_tests.js` | AI生成の一時スクリプト |
| `*.backup` | `vitest.api.config.ts.backup` |
| `apply_migration_*.js` | `apply_migration_0009.js` などAI生成マイグレーションスクリプト |
| `parse_tests.js` | AI生成の一時テスト解析スクリプト |
| `.tmp*.json` | `.tmp-container.json`, `.tmp-e2e-continue.json` など一時JSON |
| `tmp` | 拡張子なし一時ファイル（Playwright MCP等が生成） |
| `*.csv` | `boyscout-all-results.csv` などAI生成CSVレポート |
| `*_AUDIT_RESULTS.md` | `BOYSCOUT_AUDIT_RESULTS.md` などAI生成監査レポート |
| `REPAIRS_P*.md` | AI生成の修復タスクリスト（完了後はarchiveへ） |
| `FAILING_TESTS_PRIORITY.md` | AI生成のテスト失敗トリアージレポート |
| `*.agent.md` (rootのみ) | `.agents/agents/` に入れるべきエージェント定義のルート迷子 |

> **配置先ガイド**
> | ファイル種別 | 削除/移動先 |
> |---|---|
> | ログ・出力テキスト | 削除 |
> | 一時JSON/CSV | 削除 |
> | AI生成修復タスクMD | `schedule_todo_list/archive/` へ移動 |
> | DB参照ドキュメント | `docs/database/` へ移動 |
> | エージェント定義 `.agent.md` | `.agents/agents/` へ移動 |

**除外対象**: `node_modules/`, `.next/`, `src/`, `docs/`, `scripts/`, `.agents/` 配下のファイルは対象外。ルートディレクトリ直下のみを対象とする。

## 2. 削除の実行

検出されたファイルを削除してください。

```powershell
# PowerShell での実行例（Windows PowerShell 5.1 / PowerShell Core 互換）
$patterns = @('*.log', '*_output*.txt', 'test-output.txt', 'test_report.json', 'analyze_tests.js', '*.backup', 'apply_migration_*.js', 'parse_tests.js', '.tmp*.json', 'tmp', '*.csv', '*_AUDIT_RESULTS.md')
Get-ChildItem -Path . -MaxDepth 1 -File | Where-Object {
  $filename = $_.Name
  $matched = $false
  foreach ($pattern in $patterns) {
    if ($filename -like $pattern) {
      $matched = $true
      break
    }
  }
  $matched
} | Remove-Item -Force -Verbose
```

**互換性**: `-like` を使用することで、PowerShell 5.1（Windows 標準）および PowerShell Core で動作します。

## 3. 報告

- 削除したファイルがある場合: 「🧹 AI一時ファイルを N 件削除しました: [ファイル名リスト]」と報告
- 削除対象がない場合: 報告不要（静かに完了）

## 注意事項

- `page.tsx` のようなソースコードがルートに迷い込んでいる場合は、削除せず **ユーザーに確認** すること
- 判断に迷うファイルは削除せず報告する
