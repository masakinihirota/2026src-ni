# ページ独立性監査ガイド（Barrel Import Boundary Check）

## 目的

このワークフローは、**各ページが本当に独立した小さなミニアプリとして機能しているか** を確認するためのものです。

Next.js App Router でページ単位に分割したアプリケーションが、バレルインポート正しく機能しているか、他のページのコンポーネントに無意識のうちに依存していないか、という構造上の独立性を監査します。

---

## スコープ

- **監査対象**: src/app 配下のすべてのエントリーポイント（page.tsx, layout.tsx, loading.tsx, error.tsx, not-found.tsx）
- **対象インポート**: `@/components/*` で始まる imports のみ
- **除外**: 外部ライブラリ、UI コンポーネント集、ユーティリティ関数など

---

## 監査フロー

スラッシュコマンド `/barrel-import-boundary-guard` を実行すると：

1. 全 125+ エントリーポイントを自動スキャン
2. 各ファイルの `@/components/*` インポートを抽出
3. 以下の観点から分類：
   - **独立している（Compliant）**: ページ専用の barrel のみ依存
   - **やや疑わしい（Warning）**: 深い階層のコンポーネントに直接依存
   - **独立していない（Violation）**: ページ間の共有内部実装に直接依存
4. 結果をレポート出力

---

## 独立性の判定基準

### ✅ Compliant（独立している）

ページが **自分専用の barrel** にのみ依存している状態。

**パターン1**: トップレベル barrel
- インポート例: `@/components/work`
- 解釈: work グループ全体の公開 API を使用しており、他ページと共有できる粒度

**パターン2**: ページ専用 sub-barrel
- インポート例: `@/components/profile-display/profile-detail`
- 解釈: 専用ディレクトリ内の公開 API を使用しており、そのページ独自のまとまり

### ⚠️ Warning（やや疑わしい）

ページが **3階層以上の深いコンポーネントに直接依存** している状態。

- インポート例: `@/components/profile-display/profile-warehouse-page/profile-warehouse-page`
- 理由: 深い階層の個別ファイルに依存すると、ページ間の暗黙的な結合度が高まる可能性
- 現在: 警告のみ。段階導入により、モニタリングしながら削減予定
- 改善案: ページ専用の sub-barrel を整備し、公開 API として整理

### ❌ Violation（独立していない）

ページが **内部実装パスに直接依存** している状態。最も危険。

- `lib/` への依存: `@/components/<group>/lib/**`
- `hooks/` への依存: `@/components/<group>/hooks/**`
- `_internal/` への依存: `@/components/<group>/_internal/**`

理由: これらは「内部実装」であり、**複数ページから依存すると暗黙的に共有ロジックになり、独立性が完全に失われる**

---

## 実行方法

```bash
# 基本的な確認（Violation のみをチェック）
pnpm ci:barrel-isolation

# 詳細レポート（Warning も含めて表示）
pnpm ci:barrel-isolation:report

# 厳格モード（Warning も Error として扱う）
pnpm ci:barrel-isolation:strict
```

---

## 出力の見方

```
✅ Compliant: 119 件  → ページ独立が守られている
⚠️ Warning: 16 件    → 改善の余地あり
❌ Violation: 0 件   → 緊急対応が必要
```

**独立性スコア**:
- 100% Compliant = 各ページが完全に独立している（理想状態）
- Warning が多い = ページ間の無意識な結合度が高い（段階的に改善）
- Violation がある = 即座に改善すべき構造的問題

---

## 実装ファイル

- **チェックスクリプト**: `scripts/check-barrel-page-imports.mjs`
- **スキル文書**: `.agents/skills/barrel-import-boundary-guard/SKILL.md`
- **エージェント指示**: `.agents/skills/barrel-import-boundary-guard/AGENTS.md`
