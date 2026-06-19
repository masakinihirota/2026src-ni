# AIの自己改善録 (Lessons)

## 共通テンプレート

### 目的
- 再発しやすい失敗を記録し、次回以降の作業品質を継続的に向上させる。

### 必須
- 修正指摘や再発バグは、原因と対策をセットで記録する。

### 禁止
- 失敗事例を未記録のまま放置する。

### 例外
- 一時的な試行で恒久性がない事象は、記録対象から除外できる。

### 参照
- [General Rules](./general-rules.md)

## UI修正時の描画元誤認（2026-05-21）

### 問題の概要
**症状**: 「左の星座アイコンを直してほしい」という指示に対して、別画面用コンポーネント（`zodiac-anonymous-selector.tsx`）を複数ターンにわたって修正し続け、ブラウザ表示が変わらないにもかかわらず「キャッシュのせい」と説明した。ユーザーから3回指摘されてようやく正しい描画元（`step5-zodiac-anonymous-pc.tsx`）に到達した。

### 根本原因

1. **会話サマリーの惰性追従**: 前のセッションで `zodiac-anonymous-selector.tsx` を修正していた流れを引き継ぎ、新しいスクリーンショットが提示された後も同ファイルを自明の修正対象と思い込んだ。
2. **描画元の未確認**: スクリーンショット上の表示文言（「現在の星座匿名」「現在の設定」）でコード検索せず、思い込みで修正先を決めた。
3. **変化しない＝ファイル違い、の判断がなかった**: ブラウザ表示が変わらないときに「キャッシュのせい」と説明したが、正しくは「修正したファイルが描画に使われていない可能性」を先に疑うべきだった。

### 対策（必須手順）

1. **UI要素の修正依頼を受けたら、最初のターンで必ず描画元を検索する**
   - スクリーンショットの表示文言（ラベル・見出し・テキスト）を `search_subagent` または `grep_search` で検索し、実際に描画しているファイルを特定してから修正に入る。
   - 「前回触っていたファイル」という流れは無視する。

2. **修正してもブラウザ表示が変わらないときの判断順序**
   - ①修正したファイルは本当に表示経路にあるか（grep で参照元確認）
   - ②ブラウザキャッシュ（最後の候補にする）

3. **コンポーネント名が似ていても別物の可能性を常に考える**
   - `zodiac-anonymous-selector.tsx`（profile管理画面用）と `step5-zodiac-anonymous-pc.tsx`（onboarding用）のように、同じ機能を同じUIで実装したコンポーネントが複数ある場合がある。

### チェックコマンド
```powershell
# 表示文言から描画元を特定する
Select-String -Path (Get-ChildItem -Recurse -Include '*.tsx' -Path 'src').FullName -Pattern '現在の星座匿名|現在の設定'
```

---

## ターミナル出力とログ保存のルール
- **ログの標準出力**: `pnpm build` やその他のコマンドを実行する際、`> build-output.log 2>&1` のようにファイルへ出力をリダイレクトして隠蔽しないこと。
- **理由**: ビルドの進捗やエラー内容がターミナル上に表示されなくなり、ユーザー側で状況が全く見えなくなってパニックになるため。また、ゴミファイルが残ってしまうのを防ぐため。
- **解決策**: 単純に `pnpm build` または `npm run build` などを実行し、AIエージェントの `command_status` ツールを使ってその標準出力を直接読み取って解析すること。
- **Windows特有のcmd /c の禁止**: PowerShell環境で `cmd /c` を使ってコマンドを実行しないこと。ポータビリティが下がり、PATHの問題なども引き起こしやすいため、そのまま `pnpm build` などを実行する。

## React 状態管理: 永続的コンポーネントの状態リセット

### 問題の概要 (2026-03-03)
**症状**: ヘッダーのログアウトボタンで「ログイン → ログアウト → ログイン → ログアウト中...」となり、2回目のログイン後にボタンの状態が「ログアウト中...」のまま固定される。

**根本原因**:
- ヘッダーコンポーネント（`AuthButton`）は、ルート変更後もアンマウントされない「永続的コンポーネント」
- ログアウト時に `isLoggingOut = true` にセットされる
- ログアウト成功後、ページ遷移が発生するが、ヘッダーはアンマウントされないため `isLoggingOut` がリセットされない
- 再度ログインすると、`isLoggingOut = true` のまま「ログアウト中...」と表示される

**対比**:
- **ページ内のボタン**: ページ遷移時にコンポーネントがアンマウント → 状態が自動的にクリア
- **ヘッダーのボタン**: ページ遷移してもアンマウントされない → 状態が保持される

### 解決策
永続的コンポーネントでは、**依存する外部状態（認証状態など）が変化したときに、内部状態を明示的にリセットする**:

```typescript
// ❌ Bad: 状態が残り続ける
const [isLoggingOut, setIsLoggingOut] = useState(false);

// ✅ Good: 認証状態が変わったらリセット
const [isLoggingOut, setIsLoggingOut] = useState(false);

useEffect(() => {
  if (isAuthenticated) {
    setIsLoggingOut(false);  // ログイン成功時にリセット
  }
}, [isAuthenticated]);
```

### チェックポイント
- [ ] ヘッダー、サイドバー、フッターなど**永続的コンポーネント**で `useState` を使う場合、必ず依存状態の変化で内部状態をリセットする `useEffect` を追加
- [ ] ログイン/ログアウト機能を実装したら、必ず「**ログイン → ログアウト → ログイン**」の連続操作をテストケースに追加
- [ ] ローディング状態（`isLoading`, `isPending` など）は、成功/失敗時に必ずリセットされることを確認

### テストケース例
```typescript
it('ログイン→ログアウト→ログインを繰り返しても状態が正常', async () => {
  // 1. 初期状態: 未認証
  const { rerender } = render(<AuthButton />);

  // 2. ログイン
  vi.mocked(useAppAuth).mockReturnValue({ isAuthenticated: true, ... });
  rerender(<AuthButton />);
  expect(screen.getByText('ログアウト')).toBeInTheDocument();

  // 3. ログアウト
  fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }));
  await waitFor(() => expect(signOut).toHaveBeenCalled());

  // 4. 再ログイン（ここで状態がリセットされるべき）
  vi.mocked(useAppAuth).mockReturnValue({ isAuthenticated: true, ... });
  rerender(<AuthButton />);

  // 5. 「ログアウト中...」ではなく「ログアウト」が表示される
  expect(screen.getByText('ログアウト')).toBeInTheDocument();
  expect(screen.queryByText('ログアウト中...')).not.toBeInTheDocument();
});
```

### 参考資料
- 修正コミット: `src/components/layout/header/auth-button.tsx` (2026-03-03)
- 関連ファイル: `src/hooks/use-app-auth.ts`

## フィルタUI: 編集中アイテムの消失防止

### 問題の概要 (2026-04-22)
**症状**: 一覧画面で `未回答` や `未登録` のようなフィルタを有効化した状態で項目を編集すると、入力直後にその項目がフィルタ条件から外れて一覧から消え、ユーザーには「クリックできない」「選択できない」ように見える。

**根本原因**:
- 一覧の表示条件が、現在のフィルタ条件だけで機械的に再評価される
- 編集中の項目が入力によって状態変化すると、同じレンダー内でフィルタから即除外される
- UI上は操作成功より先にカード消失が起きるため、操作不能と誤認される

### 解決策
フィルタリング関数では、**編集中の項目だけはフィルタ条件に優先して残す**。少なくとも `editingItemId` が一致する間は表示を維持し、編集終了後に通常のフィルタ判定へ戻す。

```typescript
// ✅ Good: 編集中の項目は一時的に残す
export function getFilteredItems(params: {
  items: Item[]
  filter: FilterType
  editingItemId: string | null
}) {
  if (params.filter === "unanswered") {
    return params.items.filter(
      (item) => item.answers.length === 0 || item.id === params.editingItemId,
    )
  }

  return params.items
}
```

### チェックポイント
- [ ] フィルタ付き一覧で、編集中の項目が状態変化後も即時に消えないか確認する
- [ ] `active filter` と `editing item` の両立ケースを UI テストで固定する
- [ ] ロジック層にも `editingItemId` を渡し、表示維持条件を純粋関数として検証する
- [ ] 編集を閉じた後は、本来のフィルタ条件に従って一覧から外れることを確認する

### テストケース例
```typescript
it("未回答フィルタ中でも編集中の項目は表示を維持する", async () => {
  render(<Screen />)

  await user.click(screen.getByRole("button", { name: "未回答" }))
  await user.click(screen.getByRole("button", { name: "対象カードを開く" }))
  await user.click(screen.getByRole("button", { name: "選択肢A" }))

  expect(screen.getByText("対象カード名")).toBeInTheDocument()
})
```

### 参考資料
- 関連ファイル: `src/components/sandbox/values-edit-tabs/values-edit-tabs.logic.ts`
- 関連ファイル: `src/components/sandbox/values-edit-tabs/values-edit-tabs.test.tsx`

## small utility folder の deep import 見落とし（2026-05-03）

### 問題の概要

`dev`・`etc`・`debug-links` のような小規模ユーティリティフォルダは、barrel（`index.ts`）を整備していても外部ファイルから実体ファイルへ直接 import されやすい。

**発生例**: `src/components/landing-page/tales-claire/tales-claire-lp.tsx` が
`@/components/dev` ではなく `@/components/dev/clear-button/clear-browser-data-button` を直接 import していた。

**根本原因**:
- ファイル数が少ないため import 先がひと目で分かり、barrel を経由しようという意識が薄れる。
- スキャンスクリプト（`review-components-scan.mjs`）の NO_TEST 検出はあっても、
  他フォルダからの deep import 検出が自動化されていなかった。

### 対策

1. `component-architecture.md` § 5.1 に「小規模ユーティリティフォルダの deep import 定期チェック」を追記した。
2. `/review-next-page` 実行時にも当該 grep を実施するよう手順化した。

### 再発防止チェックコマンド

```powershell
# 要注意フォルダへの deep import をまとめて検索
Select-String -Path (Get-ChildItem -Recurse -Include '*.tsx','*.ts' -Path 'src' | Select-Object -ExpandProperty FullName) `
  -Pattern '@/components/(dev|etc|debug-links|sandbox-review-links)/' |
  Select-Object Filename, LineNumber, Line
```

## Client/Server 境界: Hook追加時の `"use client"` 抜け防止

### 問題の概要 (2026-04-22)
**症状**: `*.view.tsx` に `useState` を追加した後、`Ecmascript file had an error` が発生し、Turbopack の import trace に Server Component からの経路が表示される。

**根本原因**:
- Hookを使うファイルに `"use client";` がない
- `index.ts`（barrel）経由で Server Component から到達するため、ビルド時に境界違反として検出される

### 解決策
- Hookを追加した時点で、そのファイル先頭へ `"use client";` を即時付与する
- 変更後は import trace を確認し、`page.tsx -> index.ts -> view.tsx` の経路で境界違反がないことを確認する

### チェックポイント
- [ ] Hookを使う `*.tsx` の先頭に `"use client";` がある
- [ ] barrel export のある機能では `index.ts` 経由の参照経路を確認した
- [ ] `pnpm build` 実行で Client/Server 境界エラーがない

### 参考資料
- 関連ファイル: `src/components/sandbox/skill-selection/skill-selection.view.tsx`
- 関連ファイル: `src/components/sandbox/skill-selection/index.ts`

## 押下可能要素: ポインターカーソル抜け防止

### 問題の概要 (2026-04-22)
**症状**: sandbox の表示ページ・編集ページで、押せるボタンやリンクの hover 時にマウスカーソルが矢印のまま残り、押下可能と分かりづらい。

**根本原因**:
- 個別コンポーネントごとに `cursor-pointer` の付与有無がばらついていた
- ルート全体をカバーするグローバルカーソル規約がなく、ページごとの実装品質に依存していた

### 解決策
- `src/app/globals.css` に、disabled ではない `button` / `a[href]` / `[role="button"]` / フォーム連動 label を対象にしたサイト全体の pointer cursor ルールを置く
- 個別に抽象化された UI コンポーネントや疑似ボタンは、必要に応じて `cursor-pointer` を明示する
- ボタンやリンクを触るタスクでは `.agents/hooks/interactive-cursor-check.md` を着手時チェックへ含める

### チェックポイント
- [ ] 押下可能要素に hover 時の pointer cursor が出る
- [ ] disabled 要素には pointer を付けない
- [ ] `pnpm build` 実行でスタイル変更による副作用がない

### 参考資料
- 関連ファイル: `src/app/globals.css`
- 関連ファイル: `.agents/hooks/interactive-cursor-check.md`

## displayName フィールド: 識別子付きから表示用への抽出 (2026-05-18)

### 問題の概要
**症状**: プロフィール切り替えドロップダウンのヘッダーボタンで "藍の絆の魚座#96 (6edd982e-...)" が表示される。
ドロップダウンメニュー項目も同じく "#番号" が表示されるため、UI上ユーザーには内部識別子が丸見えになる。

**根本原因**:
- DB の `displayName` フィールドには "星座匿名#番号" の形式で一意性を保証する識別子が含まれている
- 表示ロジックが 1 箇所にあったため、初回修正時にドロップダウン項目の表示が見落とされた
- 複数箇所に同じ抽出ロジックが分散していると、修正漏れが起きやすい

### 解決策
1. **汎用ユーティリティ化**: `src/lib/display/anonymous-name-display.ts` を作成し、`extractAnonymousBaseName()` 関数を一箇所に集約する
2. **使用パターン**: DB の `displayName` を UI に表示する全ての箇所で、このユーティリティ経由で末尾の `#\d+` を除去する
3. **barrel 経由の公開**: `src/lib/display/index.ts` で export し、`@/lib/display` 経由でインポート可能にする

```typescript
// ✅ Good: 汎用ユーティリティで一元化
import { extractAnonymousBaseName } from "@/lib/display";

// ヘッダー表示
const headerLabel = extractAnonymousBaseName(profile.displayName);

// ドロップダウン項目
<span>{extractAnonymousBaseName(profile.displayName)}</span>
```

### チェックポイント
- [ ] 新しい displayName 表示箇所が追加されたら、必ず `extractAnonymousBaseName()` ユーティリティ経由で取得する
- [ ] deep import `@/lib/display/anonymous-name-display` ではなく、barrel `@/lib/display` から import する
- [ ] グローバル検索 `displayName` で表示処理を全スキャンし、見落とした場所がないか確認する
- [ ] 単体テストは `.test.ts` に集約し、複数コンポーネントから同じロジックがテストできる構成にする

### ユーティリティ実装
```typescript
// src/lib/display/anonymous-name-display.ts
export function extractAnonymousBaseName(displayName: string): string {
  return displayName.replace(/#\d+$/, "").trim();
}

// 例
// "藍の絆の魚座#96" → "藍の絆の魚座"
// "蒼井 澪"        → "蒼井 澪" (変更なし)
```

### テストケース
```typescript
import { extractAnonymousBaseName } from "@/lib/display";

describe("extractAnonymousBaseName", () => {
  it("末尾の #番号 を除去する", () => {
    expect(extractAnonymousBaseName("藍の絆の魚座#96")).toBe("藍の絆の魚座");
  });

  it("#番号がない場合は変更しない", () => {
    expect(extractAnonymousBaseName("蒼井 澪")).toBe("蒼井 澪");
  });

  it("複数の # がある場合は末尾のみ除去する", () => {
    expect(extractAnonymousBaseName("名前#1#2")).toBe("名前#1");
  });

  it("空白をトリムする", () => {
    expect(extractAnonymousBaseName("星座匿名#99 ")).toBe("星座匿名");
  });
});
```

### 長期改善案
API 側で `displayName` と `displayNameForUI` を分離し、バックエンド責務で識別子を除去することを検討する。
これにより、フロントエンドでの文字列加工が不要になり、メンテナンス負荷が低下する。

### 参考資料
- 実装ファイル: `src/lib/display/anonymous-name-display.ts` (新規)
- 実装ファイル: `src/lib/display/index.ts` (新規)
- 更新ファイル: `src/components/profile-display/profile-switcher/profile-switcher.tsx`
