---
description: React Hook を含む view/tsx 変更時に、`"use client"` と barrel 経由の Client/Server 境界をチェックして Turbopack import trace エラーを予防する
---

# Client Component Boundary Check Hook

React Hook を使う `*.tsx` を追加・更新した場合は、以下を必ず実行してください。

## トリガー条件

- `src/components/**` 配下で `*.tsx`（特に `*.view.tsx`）に Hook を追加したとき
- `index.ts`（barrel export）を更新し、Server Component からの参照経路が変わったとき
- `Ecmascript file had an error` / `You're importing a component that needs useState` が出たとき

## 1. Hook 使用ファイルの境界確認

1. Hook を使っているファイルの先頭に `"use client";` があることを確認する。
2. `"use client";` は import より前（1行目付近）に置く。

確認対象 Hook 例:

- `useState`, `useEffect`, `useMemo`, `useRef`, `useContext`, `useReducer`
- `useLayoutEffect`, `useTransition`, `useDeferredValue`, `useId`

## 2. barrel 経路の確認

1. `index.ts` が `view` を export している場合、`page.tsx` からの import trace を意識する。
2. Server Component 側で Hook 含有 view へ直接到達しない構成（Container 経由）になっているか確認する。

## 3. 変更後の最小検証

```powershell
pnpm build
```

## 4. 失敗時の対処

- `Ecmascript file had an error` が出たら、まず該当 `*.tsx` の先頭 `"use client";` を確認する。
- import trace に `page.tsx -> index.ts -> *.view.tsx` が出る場合は、barrel export と Client 境界を再点検する。
