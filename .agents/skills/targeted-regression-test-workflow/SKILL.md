---
name: targeted-regression-test-workflow
description: 変更点に直結する最小回帰テストを優先実行し、短時間で安全性を担保するテスト運用スキル。
context: fork
---

# Targeted Regression Test Workflow

修正の影響点に絞って最小テストを回し、再発防止と速度を両立するスキルです。

## 1. 適用シーン

- 小さなバグ修正を迅速に確認したい
- 全テスト実行だと時間がかかりすぎる
- 修正箇所と影響範囲が比較的明確

## 2. 検出ルール（対象選定）

- 変更ファイルと同ディレクトリのテストを最優先
- 次に機能境界の公開API経由テストを対象化
- 最後に横断的な回帰テストを必要最小限で追加

## 3. 実行テンプレート

### 3.1 テンプレートA: 単一テストファイル実行

```bash
pnpm test:run -- src/components/debug-links/debug-links-page.test.tsx
```

### 3.2 テンプレートB: 2段階実行

```bash
# 1) 変更直結テスト
pnpm test:run -- path/to/changed-feature.test.tsx

# 2) 関連境界テスト
pnpm test:run -- path/to/related-boundary.test.tsx
```

### 3.3 テンプレートC: 最終安全確認

```bash
pnpm build
```

## 4. 最小回帰テスト例

```typescript
import { describe, expect, it } from "vitest"

describe("回帰: 値の上書きが発生しない", () => {
  it("同じ操作を2回連続しても1回目の結果が保持される", () => {
    const state = runTwiceAndCollectState()

    expect(state.firstResult).toBeDefined()
    expect(state.secondResult).toBeDefined()
    expect(state.firstResult).not.toEqual("")
  })
})
```

## 5. 運用手順

1. 変更ファイル一覧を取得
2. 直結テストを1本選ぶ
3. RED -> GREEN を確認
4. 関連テストを1本だけ追加
5. 最後に build で整合性確認

## 6. 完了定義

- 変更直結テストがグリーン
- 関連境界テストがグリーン
- build が通る
- 既知警告と新規警告が切り分けられている
