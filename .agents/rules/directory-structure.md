---
trigger: always_on
---

# Directory Structure & File Organization

## 共通テンプレート

### 目的
- ルーティング層とコンポーネント層の責務を分離し、保守性とテスト容易性を高める。

### 必須
- `page.tsx` は表示構成に専念し、機能実装は `src/components` 配下へ配置する。
- コンポーネントはコロケーションで UI/ロジック/テストを整理する。
- 公開エクスポートは barrel（`index.ts`）で管理する。

### 禁止
- 無秩序な deep import。
- ルート層への過度なビジネスロジック集約。

### 例外
- ページレベル集約が必要な場合のみ、`page.tsx` 側のフェッチを限定的に許容する。

### 参照
- [コンポーネント構造](./component-architecture.md)
- [セキュリティ・アーキテクチャ](./security-architecture.md)

## ファイル・ディレクトリ構成

重要: このプロジェクトでは「ルーティング（ページ）」と「コンポーネント（UI/ビジネスロジック）」を明確に分離し、さらにコンポーネントごとに責務を分けることで可読性とテスト容易性を高めます。(バレルファイル)

### 1. ルーティングとコンポーネントの分離

| レイヤー           | 配置場所                                 | 責務                                                                 |
| ------------------ | ---------------------------------------- | -------------------------------------------------------------------- |
| **ページ**         | `src/app/<route>/page.tsx`, `layout.tsx` | 「どのコンポーネントを並べるか」のみ。副作用（データ取得）は持たない |
| **コンポーネント** | `src/components/<page-name>/`            | UI、ロジック、データ取得を含む機能実装                               |

- ページは表示とコンポーネントの組み立てに専念
- データの取得（フェッチ）は各機能・コンポーネント配下の `*.logic.ts` や `*.fetch.ts` に配置

### 2. コンポーネントのコロケーション（責務別ファイル配置）

各コンポーネントは独立したフォルダにし、UI・ロジック・fetch・テストを分割します。

**例:**

```
src/components/profile-list/profile-list/
├─ profile-list.tsx                    # プレゼンテーション（UI）
├─ profile-list.container.tsx          # コンテナコンポーネント（状態管理）
├─ profile-list.logic.ts               # ビジネスロジック／ユーティリティ
├─ profile-list.logic.test.ts          # ロジックのユニットテスト
├─ profile-list.logic.integration.test.ts  # ロジックの結合テスト
└─ profile-list.test.tsx               # UIコンポーネントのテスト
```

**コロケーションの利点:**

- 関連ファイルがまとまっているため、変更範囲が分かりやすい
- Agent による自動生成やテスト作成が容易

### 3. Barrel Export と ネームスペースインポート

ページ単位で使うコンポーネント群は `src/components/<page-name>/index.ts` で名前付きエクスポートし、ページ側でネームスペースインポートします。

**Barrel Export（`src/components/profile-list/index.ts`）:**

```typescript
// 📌 Barrel Export: 再エクスポート専用、ロジック記述禁止
export { ProfileList } from "./profile-list/profile-list";
export { ProfileListContainer } from "./profile-list/profile-list.container";
export type { Profile, SortOrder } from "./profile-list/profile-list.logic";
```

**ページ側のインポート（`src/app/sample/page.tsx`）:**

```typescript
// ネームスペースインポートで可読性を確保
import * as Sample from "../../components/profile-list";

export default function SamplePage() {
  return (
    <>
      <Sample.ProfileListContainer />
    </>
  );
}
```

### 4. データフェッチの配置原則

| 項目               | ルール                                                             | 理由                                                |
| ------------------ | ------------------------------------------------------------------ | --------------------------------------------------- |
| **配置場所**       | `src/components/**/*.logic.ts` または `*.fetch.ts`                 | 機能単位で副作用を完結させる                        |
| **ページ側**       | 原則フェッチ禁止（表示・組み立て専念）                             | テストとモックが容易                                |
| **例外**           | ページレベル集約が必要な場合のみ `page.tsx` に配置可（推奨しない） | 現実的制約への対応                                  |
| **データ受け渡し** | props 経由を優先                                                   | 依存関係の明示化                                    |
| **Server Actions** | **原則禁止** (REST API推奨)                                        | [セキュリティ基準](./security-architecture.md) 準拠 |

### 5. 命名とエクスポート方針

| 項目                   | ルール                                                 |
| ---------------------- | ------------------------------------------------------ |
| **エクスポート**       | デフォルトエクスポート禁止、名前付きエクスポートを使用 |
| **フォルダとファイル** | フォルダ名とファイル名は一致させ、パス解決を簡潔に     |
| **ディレクトリ名**     | ケバブケース (例: `components/profile-list`)           |

### 6. テストの分離

| テスト種別         | ファイル名                    | 対象                                   |
| ------------------ | ----------------------------- | -------------------------------------- |
| **UIテスト**       | `*.test.tsx`                  | コンポーネントの表示・インタラクション |
| **ロジックテスト** | `*.logic.test.ts`             | ビジネスロジックのユニットテスト       |
| **結合テスト**     | `*.logic.integration.test.ts` | データ取得を含む結合テスト             |

### 7. 完全な構成例

**ディレクトリ構造:**

```
src/
├── app/
│   └── sample/                    # サンプルページ
│       ├── page.tsx               # ページコンポーネント（副作用は持たず表示に専念）
│       └── page.test.tsx          # ページコンポーネントのテスト
└── components/
    ├── profile-list/              # ページ単位コンポーネント群
    │   ├── index.ts               # Barrel Export（再エクスポート専用）
    │   └── profile-list/          # ProfileList機能単位コンポーネント群
    │       ├── profile-list.tsx                    # プレゼンテーション（UI）
    │       ├── profile-list.container.tsx          # コンテナ（状態管理）
    │       ├── profile-list.logic.ts               # ビジネスロジック
    │       ├── profile-list.logic.test.ts          # ロジックのユニットテスト
    │       ├── profile-list.logic.integration.test.ts  # ロジックの結合テスト
    │       └── profile-list.test.tsx               # UIコンポーネントのテスト
    └── ui/                        # 共通UIコンポーネント（Shadcn/UI）
        ├── avatar.tsx
        └── card.tsx
```

**Barrel Export 厳守** | 各ディレクトリには必ず **`index.ts`** ファイルを設置し、そのレイヤーで公開してよいものだけを export する

### 8. 例外ルール（トライアル版について）

以下のトライアル版機能（お試し用ページ）に関しては、開発効率と既存資産の活用の観点から、オリジナルコンポーネント（正規版の機能）への依存を許可します。

- **対象**: `onboarding-trial`, `home-trial` などのトライアル関連コンポーネント
- **許可事項**: トライアル版コンポーネントから、対応する正規版（オリジナル）のコンポーネントやロジックをインポートして利用すること。
- **理由**: トライアル版は正規版の機能の一部を利用する形態であり、開発効率向上とコード重複排除のため、厳密な疎結合ルールの例外とする。

---

## 9. ルートディレクトリ配置基準（リポジトリ衛生ルール）

**目的**: AI生成の一時ファイルや作業メモがルートに散乱するのを防止し、常にクリーンな状態を維持する。

### 許可されるルートファイル

ルートディレクトリに置いてよいのは **プロジェクトの実行・ビルド・ツール設定** に直接必要なファイルのみ。

| カテゴリ | ファイル例 | 説明 |
|----------|-----------|------|
| パッケージ管理 | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` | 依存関係と実行スクリプト |
| ビルド/フレームワーク設定 | `next.config.ts`, `tsconfig.json`, `tsconfig.tsbuildinfo` | Next.js・TypeScript構成 |
| DB/ORM設定 | `drizzle.config.ts` | Drizzle設定 |
| インフラ | `docker-compose.yml` | ローカル開発インフラ |
| ツール設定 | `eslint.config.mjs`, `postcss.config.mjs`, `vitest.*.ts/config.ts` | 静的解析・テスト設定 |
| 環境変数 | `.env`, `.env.local`, `.env.example` | 環境変数テンプレート |
| Git管理 | `.gitignore`, `.npmrc` | Git/npm制御 |
| 必須ドキュメント | `README.md` | プロジェクト概要（1ファイルのみ） |

### ルートに置いてはいけないファイル

| 種別 | NG例 | 正しい配置先 |
|------|------|------------|
| AI生成マイグレーションスクリプト | `apply_migration_*.js` | `scripts/` または削除 |
| AI生成テスト解析スクリプト | `parse_tests.js`, `analyze_tests.js` | 削除 |
| AI生成一時ファイル | `.tmp*.json`, `tmp`, `*.backup` | 削除 |
| AI生成ログ/出力テキスト | `*.log`, `*_output*.txt`, `*.csv`（作業結果） | 削除 |
| 修復タスクリスト（AI生成） | `REPAIRS_P*.md`, `FAILING_TESTS_PRIORITY.md` | `schedule_todo_list/archive/` |
| DB参照ドキュメント | `DB_ANTIPATTERN_FIXES.md` | `docs/database/` |
| エージェント定義ファイル | `*.agent.md` | `.agents/agents/` |
| デザインコンテキスト | `.impeccable.md` | `.agents/impeccable.md`（既存） |

### 自動クリーンアップ

タスク完了時・コミット前に `.agents/hooks/cleanup-temp-files.md` で定義されたフックを実行すること。
フックはパターンマッチングで自動削除する PowerShell スクリプトを含む。

### 違反時の対処

1. ファイルの性質を判断（削除 / 移動 / 保留）
2. 削除する場合は `cleanup-temp-files.md` のコマンドを使用
3. 移動する場合は上記「正しい配置先」に従う
4. 判断に迷う場合はユーザーに確認する

