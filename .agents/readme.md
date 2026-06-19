
参考
sickn33/antigravity-awesome-skills: Claude Code/Antigravity/Cursor 向けの 900 種類以上のエージェントスキルを収録した究極のコレクション。Anthropic と Vercel の公式スキルを含む、AI エージェント向けの実戦テスト済みの高性能スキルを収録。
https://github.com/sickn33/antigravity-awesome-skills

https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/BUNDLES.md

https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/BUNDLES.md

## GitHub Copilot との統合

本プロジェクトでは、VS Code上のGitHub CopilotとAntigravityエディタが同じルールセットを参照できるよう、`.agents/` フォルダを唯一の Single Source of Truth として運用しています。
旧体制の `.github/instructions/` で管理されていたプロンプトはすべて当フォルダの `rules/` および `skills/` に統合されました。

**エディタ間の一貫性について:**
- **Antigravity**: 自動的に `.agents/rules/` と `.agents/skills/` を読み込みます。
- **VS Code**: User Settings または Workspace Settings で指定することで、GitHub Copilot がこれらのルールを参照します。
  - `chat.instructionsFilesLocations` で `.agents/rules`
  - `chat.hookFilesLocations` で `.agents/hooks`
これにより、どのエディタを使用しても一貫したコード品質、アーキテクチャ規約、およびセキュリティ標準が適用されます。

## 作業開始時の推奨テンプレート

毎回の着手時は、次の順で確認します。

1. `.agents/rules/README.md` を開き、対象ルールを特定する。
2. React Hook を含む `*.tsx` / `*.view.tsx` を触る可能性があれば、実装前に `.agents/hooks/client-component-boundary-check.md` を確認する。
3. Hook を使うファイルでは、先頭の `"use client";` と barrel export の到達経路確認を実装計画へ含める。
4. 実装後は `pnpm build` を最小検証に含める。
