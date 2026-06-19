---
description: クリック可能領域のホバー時にカーソルをポインター表示へ統一する
---

# Cursor Pointer Hover Workflow

このワークフローは、クリック可能なUI要素でホバー時にカーソルが明確に「押せる」状態であることを保証します。

## 目的

- ボタンやクリック可能領域で `cursor: pointer` を明示し、操作可能性を視覚的に伝える
- `disabled` 状態では `cursor: not-allowed` を適用し、押せない状態を明確にする

## 手順

1. 対象コンポーネントを確認し、クリック可能要素（`button`, `a`, `role=button` を持つ要素）を列挙する。
2. 押下可能要素には `cursor-pointer` を付与する。
3. `disabled` を持つボタンには `disabled:cursor-not-allowed` を追加する。
4. 既存のアクセシビリティ属性（`aria-label` など）を維持する。
5. 既存テストを実行し、UI挙動に回帰がないことを確認する。

## 実装ルール

- Tailwind CSS クラスで実装する（`cursor-pointer`, `disabled:cursor-not-allowed`）。
- 視認性に関わる既存デザイン（色、サイズ、余白）は原則維持する。
- 非活性要素に `cursor-pointer` を付けない。

## コマンド例

- `/cursor-pointer-hover`
