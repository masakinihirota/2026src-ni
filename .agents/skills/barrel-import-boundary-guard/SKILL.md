---
name: barrel-import-boundary-guard
description: App Router のページ単位でバレルインポート境界を監査し、各ページが独立したミニアプリとして機能しているかを検証するスキル。
context: fork
---

# Barrel Import Boundary Guard

**各ページが本当に独立した小さなミニアプリとして機能しているか** を確認します。

App Router の entrypoint（page/layout/loading/error/not-found）を対象に、
`@/components/*` import が「ページ単位の独立構造」を守っているかを監査します。

## 1. 適用シーン

- **ページの独立性が本当に守られているか確認したい**
  - 複数ページが無意識のうちに同じコンポーネントに依存していないか
  - 各ページが「自分専用のミニアプリ」として成り立っているか

- **アーキテクチャ劣化を早期検知したい**
  - deep import が増えてスパゲッティ化する前に検知
  - 新機能追加時にページ間の結合度が高くなっていないか確認

- **ルール遵守を自動チェックしたい**
  - 再現性のある定期的な監査を行いたい
  - メンバー間で「独立性」の基準を共有したい

## 2. 実行コマンド

```bash
# 基本的な確認
pnpm ci:barrel-isolation
```

詳細レポート（Warning も含む）:

```bash
pnpm ci:barrel-isolation:report
```

厳格モード（Warning も Error 扱い）:

```bash
pnpm ci:barrel-isolation:strict
```

## 3. 判定ルール

| パターン | 例 | 判定 | 解釈 |
|---|---|---|---|
| トップレベル barrel | `@/components/values` | ✅ OK | グループ全体の公開 API。他ページとも共有可能な粒度 |
| ページ単位 sub-barrel | `@/components/work/work-profile-tabs` | ✅ OK | ページ専用の公開 API。独立した UI の集合 |
| 3階層以上の deep import | `@/components/profile-display/profile-warehouse-page/profile-warehouse-page` | ⚠️ Warning | 深い階層の個別ファイルに直接依存。ページ間の暗黙的な結合度が高い |
| 内部実装パス deep import | `@/components/foo/lib/x`, `@/components/foo/hooks/x`, `@/components/foo/_internal/x` | ❌ Error | **複数ページから使われると共有ロジックになり、独立性を失う。最も危険** |

**スコア化**:
- 100% Compliant = 各ページが完全に独立（理想状態）
- Warning が多い = ページ間の結合度が高い（段階的に改善）
- Violation がある = 独立性が失われている（即改善対象）

補足:

- 初期導入は段階方式（Warning を可視化しながら削減）を前提にする。
- `--strict` で Warning を Error に昇格し、CI で強制できる。

## 4. 対象範囲

- `src/app/**/{page,layout,loading,error,not-found}.{ts,tsx}`
- 全 125+ エントリーポイントを自動スキャン

## 5. 完了定義

- `pnpm ci:barrel-isolation` が green
- 各ページが自分専用の barrel のみ依存している（Compliant %)が高い）
- Violation（lib/hooks/_internal への依存）がない
- Warning は段階導入計画に基づいて段階的に削減
