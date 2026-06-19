---
trigger: always_on
---

# Sandbox → Production 昇格ルール

## 共通テンプレート

### 目的
- sandbox で実験・検証したコンポーネントを本番（`src/components/` 正規フォルダ）へ昇格する際に、
  重複腐敗・deep import・参照残骸が発生しないよう手順を定める。

### 必須
- 下記「昇格チェックリスト」を全ステップ完了してから PR を作成すること。

### 禁止
- sandbox 版ファイルを残したまま、本番版と二重に存在させること。
- 昇格後も sandbox ファイルを参照し続ける deep import を放置すること。

### 例外
- sandbox 専用の実験データ（モックデータ、定数）は、本番昇格対象外とする場合がある。
  その場合はコメントで「Sandbox 専用・昇格対象外」と明記すること。

### 参照
- [component-architecture.md](./component-architecture.md)
- [general-rules.md](./general-rules.md)

---

## 昇格チェックリスト（4ステップ）

sandbox 内のコンポーネントを本番へ移植する際、以下を**順番に**実施すること。

### ① barrel import へ切り替え

昇格先（`src/components/[機能名]/index.ts`）から正規の barrel export を作成し、
参照元ファイルの import を `@/components/[機能名]` 経由に変更する。

```ts
// Before（sandbox 内の直接参照）
import { Foo } from "@/components/sandbox/some-feature/foo";

// After（正本 barrel 経由）
import { Foo } from "@/components/some-feature";
```

### ② sandbox 版ファイルを削除

昇格元の sandbox 版ファイル（実体）を削除する。

```powershell
Remove-Item "src/components/sandbox/[機能名]/[ファイル名].tsx"
```

### ③ 参照残存チェック（grep）

旧パスへの参照が残っていないかをプロジェクト全体で確認する。

```powershell
# パターンA: 絶対 import パスの残骸
rg "sandbox/[機能名]/[ファイル名]" src/

# パターンB: 相対 import の残骸（例: ../[機能名]/[ファイル名]）
rg "\.\./[機能名]/[ファイル名]" src/
```

**結果が 0 件であることを確認してから次のステップへ進む。**

### ④ テスト実行

昇格対象コンポーネントと、それを参照していたファイルのテストを実行し、全件 PASS を確認する。

```powershell
pnpm test:file -- src/components/[機能名]
```

既存失敗（今回の変更と無関係）がある場合は、
`git stash` で変更前に戻して同じテストを実行し、**変更前から失敗していたことを確認・記録すること**。

---

## 典型的な失敗パターンと対策

### パターン: sandbox コピー → 本番昇格 → sandbox 側が更新されず乖離

**発生状況:**
1. sandbox に `creation-flow-return-banner.tsx` を作成
2. 本番昇格で `src/components/creation-flow-return-banner/` として独立
3. sandbox 側のファイルを削除しなかったため、sandbox 内 8 ファイルが旧パスを参照し続けた
4. 本番版が更新されても sandbox 版には反映されず、両者の実装が乖離した

**対策:** 本昇格チェックリストの ①〜④ を完走すること。

---

## 昇格判断の基準

以下の条件が揃ったら sandbox から本番昇格を検討する。

| 条件 | 内容 |
|------|------|
| テスト存在 | `.test.tsx` または `.test.ts` が存在し PASS していること |
| 型安全 | TypeScript の型エラーがないこと |
| アクセシビリティ | `role` / `aria-*` の基本属性が付いていること |
| デザインシステム準拠 | `ui-ux-guidelines.md` に従ったスタイルであること |
| barrel export 設計 | `index.ts` で単一公開 API を提供していること |
