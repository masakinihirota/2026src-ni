# Rules Index

このディレクトリは、実装判断の正本となるルール群です。
`copilot-instructions.md` は指揮役に限定し、個別判断は本ディレクトリを参照します。

## 参照順序

1. `general-rules.md`（全体統制・共通動作）
2. 目的別ルール（下表）
3. `strict-review-standards.md`（重大度基準の最終ゲート）

## 作業開始時の定型手順

1. まず `general-rules.md` を確認する。
2. React Hook を含む `*.tsx` / `*.view.tsx` を触る可能性がある場合は、実装前に `.agents/hooks/client-component-boundary-check.md` を確認する。
3. 型安全・ビルド安定性に関わる変更では `coding-standards.md` も合わせて確認する。
4. タブ名の追加・編集・リネーム処理を触る場合は、実装前に `.agents/hooks/tab-name-normalization-check.md` を確認する。
5. `src/lib/api/routes/**` や `src/app/api/[[...route]]/route.ts` を触る場合は、実装前に `.agents/hooks/hono-api-implementation-check.md` を確認する。

## 目的別ルール早見表

| 目的 | 参照ファイル |
|------|-------------|
| **AIエージェント共通オーケストレーション** | `ai-orchestrator.md` |
| 型安全・ビルド安定性 | `coding-standards.md` |
| コンポーネント境界・公開API（`no-intra-barrel-import` 含む） | `component-architecture.md` |
| 配置規約・責務分離 | `directory-structure.md` |
 | 長大ファイル分割（500行目安） | `large-file-refactoring.md` |
| UI/UX方針 | `ui-ux-guidelines.md` |
| アクセシビリティ | `accessibility-guidelines.md` |
| セキュリティ境界 | `security-architecture.md` |
| Server Action例外運用 | `server-action-error-handling.md` |
| ログ/監査 | `logging-rules.md` |
| テスト戦略（TDD） | `tdd-guidelines.md` |
| Git運用 | `git-workflow.md` |
| TODO運用 | `todo-list-management.md` |
| 再発防止ナレッジ | `lessons.md` |
| **Sandbox → 本番昇格手順（4ステップ）** | `sandbox-promotion-rules.md` |

## 整理方針

- 同じ規則を複数ファイルへ重複記述しない。
- 共通原則は `general-rules.md`、領域固有は各専門ルールへ配置する。
- ルール追加時は「目的別ルール早見表」に参照を追記する。
