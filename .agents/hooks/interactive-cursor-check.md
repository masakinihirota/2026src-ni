---
description: ボタン・リンク・タブ・トグルなど押下可能要素を追加・更新した時に、hover時のポインターカーソルと disabled 状態を点検して UI の押下可能サイン抜けを防止する
---

# Interactive Cursor Check Hook

押下可能要素を追加・更新した場合は、以下を必ず実行してください。

## トリガー条件

- `button` / `a[href]` / `[role="button"]` を追加したとき
- タブ、トグル、フィルター、カード選択UIなど、押下可能な見た目の要素を変更したとき
- `label` 経由で checkbox / radio / select / textarea を操作するUIを追加したとき
- 「押せるのにカーソルが矢印のまま」という指摘を受けたとき

## 1. グローバル適用の確認

1. `src/app/globals.css` のサイト全体カーソルルールで対象要素がカバーされるか確認する。
2. `button:not(:disabled)` / `a[href]` / `[role="button"]:not([aria-disabled="true"])` / フォーム連動 `label` に該当する場合は、グローバルルールが効く前提でよい。

## 2. 個別要素の補完

1. 抽象化コンポーネントや疑似ボタンでグローバル対象外の場合は、`cursor-pointer` を明示する。
2. disabled 要素には `cursor-pointer` を付けず、必要に応じて `cursor-not-allowed` などを使う。

## 3. 確認ポイント

- hover 時に押下可能要素が pointer cursor になる
- disabled 要素は pointer cursor にならない
- 表示ページと編集ページで押下可能サインが一致している

## 4. 変更後の最小検証

```powershell
pnpm build
```
