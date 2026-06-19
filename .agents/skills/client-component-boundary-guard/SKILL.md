---
name: client-component-boundary-guard
description: Next.js App Router で React Hook を使う view/tsx の Client境界を点検し、`"use client"` 抜けと barrel 経由の import trace エラーを予防するスキル。
context: fork
---

# Client Component Boundary Guard

React Hook を含む UI ファイルを変更するときに、Client/Server 境界エラーを予防するためのスキルです。

## 適用シーン

- `*.view.tsx` / `*.tsx` に `useState` など Hook を追加した
- `index.ts`（barrel export）を変更した
- Next.js ビルドで `Ecmascript file had an error` が出た
- Turbopack import trace に `page.tsx -> index.ts -> view.tsx` が出た

## 必須ルール

1. Hook を使う `*.tsx` には必ず `"use client";` を先頭に置く
2. `"use client";` は import より前に配置する
3. Server Component から Hook 含有 view へ直接到達しない構成を確認する
4. 変更後に `pnpm build` で境界エラーがないことを確認する

## 実行チェックリスト

- [ ] Hook 追加ファイルの先頭に `"use client";` がある
- [ ] `index.ts` の export が Server 側 import 経路を壊していない
- [ ] import trace で Client/Server 境界が正しい
- [ ] `pnpm build` が通る

## 典型的な失敗パターン

- `useState` を追加したが `"use client";` を忘れる
- barrel に `view` を export しており、Server 側から予期せず到達する
- Container には `"use client";` があるが、view 側にない

## 修正テンプレート

```tsx
"use client";

import { useMemo, useState } from "react";
```

## 最小検証

```powershell
pnpm build
```
