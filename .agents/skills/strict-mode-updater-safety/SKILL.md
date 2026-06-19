---
name: strict-mode-updater-safety
description: React Strict Modeで露呈するsetState updaterの副作用バグを、検出ルール・修正テンプレート・最小回帰テストで再発防止するスキル。
context: fork
---

# Strict Mode Updater Safety

React Strict Mode で発生しやすい「setState updater の非純粋性」に起因する不具合を、短時間で検出・修正・固定化するためのスキルです。

## 1. このスキルを使う場面

- 開発環境だけで再現する状態不整合がある
- 連続クリックや連続実行で、1回目と2回目の結果が変わる
- setState((prev) => ...) 内で ref や外部変数を触っている
- 「一度は通るが次で壊れる」系の再発を止めたい

## 2. 検出ルール（Detection Rules）

### 2.1 最優先で疑うパターン

- updater 関数内で ref を読む/書く
- updater 関数内で外部 mutable 値を変更する
- updater 関数内で非決定的値（Date.now, Math.random）に依存する
- updater 関数内で副作用（ログ送信、API呼び出し、DOM操作）を行う

### 2.2 NG 例

```typescript
setFormData((previous) => {
  const idx = pendingIndexRef.current
  pendingIndexRef.current = null
  return {
    ...previous,
    targets: [idx],
  }
})
```

### 2.3 OK 例

```typescript
const idx = pendingIndexRef.current
pendingIndexRef.current = null

setFormData((previous) => {
  return {
    ...previous,
    targets: [idx],
  }
})
```

### 2.4 迅速な探索観点

- setState の updater に渡している関数を全件確認する
- updater の外に出せる処理を抽出する
- updater を「前状態 -> 次状態」の純粋計算だけに限定する

## 3. 修正テンプレート（Fix Template）

### 3.1 テンプレートA: ref 退避

```typescript
// 1) updater の外で mutable な入力を確定
const captured = mutableRef.current
mutableRef.current = null

// 2) updater は純粋変換のみにする
setState((prev) => {
  return {
    ...prev,
    value: captured,
  }
})
```

### 3.2 テンプレートB: 非決定値の先取り

```typescript
const requestId = Date.now()

setState((prev) => {
  return {
    ...prev,
    requestId,
  }
})
```

### 3.3 テンプレートC: 副作用の分離

```typescript
// 副作用はイベントハンドラ側で実施
logger.info("submit clicked")

setState((prev) => {
  return {
    ...prev,
    submitted: true,
  }
})
```

## 4. 最小回帰テスト例（Vitest + RTL）

以下は「連続実行で上書きされない」ことを固定化する最小テストです。

```tsx
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StrictMode } from "react"
import { describe, expect, it } from "vitest"
import { ProfileCreationWizard } from "../profile-creation-wizard"

describe("Strict Mode updater safety", () => {
  it("+候補を追加を2回押すと候補1と候補2が独立して保持される", async () => {
    const user = userEvent.setup()

    render(
      <StrictMode>
        <ProfileCreationWizard />
      </StrictMode>
    )

    await user.click(screen.getByRole("button", { name: "+ 候補を追加" }))
    await waitFor(() => {
      expect(screen.getByText(/星座匿名候補1:.+/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "+ 候補を追加" }))
    await waitFor(() => {
      expect(screen.getByText(/星座匿名候補1:.+/)).toBeInTheDocument()
      expect(screen.getByText(/星座匿名候補2:.+/)).toBeInTheDocument()
    })
  })
})
```

## 5. 運用手順（小さく始める）

1. 再現手順を 1 つに固定する
2. 失敗テストを 1 件だけ先に追加する
3. 修正テンプレートA/B/Cのいずれかで最小修正する
4. 対象テストのみ実行してグリーン化する
5. 同系統の updater を横展開点検する

## 6. 完了定義（Definition of Done）

- 対象バグの再現テストが RED -> GREEN になっている
- updater 内に mutable 参照と副作用が残っていない
- 連続操作テスト（2回以上）が通っている
- テスト名は日本語で仕様意図が読める

## 7. 注意点

- Strict Mode は開発時の異常検出器として有効化したまま運用する
- 本番で見えない不具合ほど、この系統を優先して固定化する
- updater を純粋化すると、将来のリファクタでも壊れにくくなる
