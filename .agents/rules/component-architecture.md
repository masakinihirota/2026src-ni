---
trigger: always_on
---

# Component Architecture Rules

`src/components` は、価値観サイトの主要機能を機能単位で整理するためのディレクトリです。

## 共通テンプレート

### 目的
- 機能境界を明確化し、依存関係を公開API経由へ統一する。

### 必須
- 機能横断参照は `index.ts` など公開API経由で行う。
- `src/components` 直下カテゴリは本ルールの許可リストに従う。

### 禁止
- `@/components/app` など包括フォルダ依存。
- `@/components/**/_*/**` への直接 import。

### 例外
- 同一機能内の相対 import は許可する。

### 参照
- [ディレクトリ構造](./directory-structure.md)
- [コーディング規約](./coding-standards.md)

## 1. 目的

- 機能境界を明確にして、実装時の探索範囲を限定する。
- 機能間の依存を公開 API 経由に統一し、密結合を防ぐ。
- ランディング系とアプリ本体機能を分離し、責務を明確にする。

## 2. トップレベル分類（固定方針）

`src/components` 直下は、以下の機能カテゴリを許可カテゴリとして運用する。

- `admin`
- `anonymous-name-selector`
- `auth`
- `creation-flow-return-banner`
- `debug-links`
- `dev`
- `domains`
- `etc`
- `home`
- `home-trial`
- `landing-page`
- `landing-page-mini`
- `layout`
- `media-rating`
- `media-rating-cockpit`
- `profile-display`
- `profile-list`
- `public`
- `root-account`（移行期間中の一時エイリアス）
- `root-accounts`
- `sandbox`
- `sandbox-review-links`
- `shared-tabs`
- `skills`
- `trial`
- `trial-page`
- `user`
- `ui`
- `value-sets`
- `values`
- `values-all-list`
- `values-edit`
- `values-edit-tabs`
- `values-display-cockpit`
- `values-shared-tabs`
- `work`

補足:

- `auth` / `root-accounts` / `profile` は本プロダクトの主機能として、`src/components` 直下で独立させる。
- ランディングページ関連は `landing-page` カテゴリに統合して管理する（`good-life`, `legendary-speech`, `sanibonani` は `landing-page` 配下に実装済みのため独立カテゴリ不要）。
- `shared-tabs` は横断UI基盤（共通タブレイアウト）として扱い、`values-shared-tabs` や今後のタブ機能から公開API経由で参照する。

補足（現行構成）:

- `profile` 機能は現行では `profile-display` として管理される。
- ランディング関連は `landing-page` に統合済み（`good-life`, `legendary-speech`, `sanibonani` は `landing-page` 配下に実装）。
- `sanctuary` は `root-account/sanctuary` として実装済み（`root-account` 互換期間中）。
- `value-history-timeline` は `values/value-history-timeline` として実装済み。
- `onboarding-pc` は `/onboarding` へのリダイレクトのみでコンポーネント不要。
- `root-account` は **移行期間中のエイリアス名** とし、正式名称は `root-accounts` とする。

### root-account から root-accounts への段階移行

- 正式名称は `root-accounts` とし、新規追加・更新・参照は `root-accounts` を使用する。
- `root-account` は互換目的の一時フォルダとしてのみ許容し、新規コードの追加先にしない。
- 互換期間中は `index.ts` 等の公開APIでエイリアスを維持し、内部実装への deep import を禁止する。

#### 互換終了期限（固定）

- `root-account` 互換運用の終了期限は **2026-06-30 (JST)** とする。
- 終了期限以降、`root-account` は実装を持たない互換エントリ（再エクスポート/リダイレクト）のみを許容し、実体ロジックの追加・更新を禁止する。
- 終了期限を延長する場合は、期限到来前に本ルールを更新し、延長理由・新期限・撤去計画を明記する。

#### 廃止完了条件（先に定義する）

- `root-account` への参照が検索上 0 件（import/リンク/ドキュメント参照を含む）。
- CI（型チェック・lint・テスト）が連続 2 週間グリーン。
- 新規PRで `root-account` の新規参照追加が 0 件。
- 上記を満たした時点で `root-account` を削除し、ルール本文からも互換記述を除去する。

追加ルール:

- 新カテゴリを追加する場合は、事前にルール更新（本ファイル更新）を行ってからフォルダを作成する。
- 一時的な実験カテゴリは `shared` 直下に閉じ込め、トップレベル直下へは追加しない。

## 3. 命名規則

- 主要機能フォルダ名は `kebab-case` を使用する。
- `src/components/app` のような包括フォルダは新規作成しない。
- 主要機能フォルダに先頭アンダースコアは付けない。
- 先頭アンダースコアは、各機能内の内部実装領域（例: `_internal`）に限定して使用する。

## 4. 公開 API と import 規則

- 各機能は公開 API ファイルを必ず 1 つ以上持つ（既定: `index.ts`）。
- 公開 API ファイル名は `index.ts` を第一選択とし、必要時のみ `public-api.ts` を許容する。
- 他機能を参照する場合は、公開 API ファイル経由を原則とする。
- 他機能の `_internal` など内部実装ディレクトリへの直接 import を禁止する。
- `src/lib` からコンポーネント配下の型やスキーマを参照する場合も、公開 API ファイルを優先する。

### no-intra-barrel-import（必須）

- 同一機能グループ内のファイルから、同一グループの `index.ts`（barrel）を import してはならない。
- 同一機能グループ内では、相対パスで実体ファイル（例: `./lib/*`, `./hooks/*`, `./types/*`）を直接 import する。
- 理由: `barrel -> 詳細ファイル -> barrel` の循環依存が発生しやすく、`eslint-plugin-import/no-cycle` の恒常的な違反原因になるため。

対象例:

- `src/components/root-account/**` 内から `@/components/root-account` を import しない。
- `src/components/trial/**` 内から `@/components/trial` を import しない。

許可:

- 他機能グループからの参照は、従来どおり公開 API（`index.ts`）経由を原則とする。
- 同一機能グループ内の相対 import は許可する。

レビュー観点:

- 変更対象ファイルと同じ機能グループ名への alias import（`@/components/<group>`）が増えていないこと。
- 変更後に `pnpm run lint` で `no-cycle` を新規発生させていないこと。

deep import の定義:

- deep import とは、機能境界を跨いで公開 API ファイル以外（例: `ui/`, `hooks/`, `_internal/`）へ直接到達する import を指す。
- 同一機能内での相対 import は許可する。

## 5. 実装時の AI 指示

- 実装前に、追加/変更対象がどの機能カテゴリに属するかを明示する。
- 機能境界をまたぐ参照が必要な場合は、先に公開 API ファイルを整備する。
- 既存の deep import を増やさない。
- 構造ルールに反するフォルダ追加を行わない。

適用対象:

- 本章は AI 向けの必須手順であり、レビュー時には人間実装にも同等の観点を適用する。

### 5.1 小規模ユーティリティフォルダの deep import 定期チェック

`dev`・`etc`・`debug-links` など「小規模ユーティリティフォルダ」は、barrel（`index.ts`）を整備しても外部から実体ファイルを直接 import されやすい。以下の手順で定期的に確認する。

#### チェック対象フォルダ（要注意リスト）

| フォルダ | 理由 |
|----------|------|
| `dev` | 開発専用ユーティリティ。LP等で単発 import されやすい |
| `etc` | 雑多な共通コンポーネント置き場。参照元が分散しやすい |
| `debug-links` | デバッグ用。用途が限定的で import 経路が見落とされやすい |
| `sandbox-review-links` | サンドボックス専用。実験コードから直接参照されやすい |

#### チェックコマンド（PowerShell）

```powershell
# dev フォルダの deep import を検索
Select-String -Path 'src/**/*.tsx','src/**/*.ts' -Pattern '@/components/dev/' -Recurse

# etc フォルダの deep import を検索
Select-String -Path 'src/**/*.tsx','src/**/*.ts' -Pattern '@/components/etc/' -Recurse

# debug-links フォルダの deep import を検索
Select-String -Path 'src/**/*.tsx','src/**/*.ts' -Pattern '@/components/debug-links/' -Recurse
```

または `grep_search` で以下のパターンを検索する。

```
@/components/dev/
@/components/etc/
@/components/debug-links/
@/components/sandbox-review-links/
```

#### 修正方針

- deep import が検出されたら、`@/components/<フォルダ名>` のような barrel 経由に即修正する。
- barrel に export がなければ `index.ts` に追加してから修正する。
- `/review-next-page` でレビューした際にも上記 grep を実施すること。

## 6. ESLint による補強

以下を最低限のガードとして運用する。

- `@/components/app` への import を禁止する。
- `@/components/**/_*/**` への直接 import を禁止する。
- 機能境界を跨ぐ deep import（公開 API ファイル以外）を禁止する。
- `src/components` 直下に未許可カテゴリを追加した場合は警告する。

段階移行中は `warn` で運用し、移行完了後に `error` へ引き上げる。

移行完了の目安:

- CI 上で deep import 警告が 0 件で 2 週間継続。
- 新規 PR で構造違反が 0 件。

## 3. 高度なコンポーネント設計パターン

### 3.1 useImperativeHandle による父→子の命令型インターフェース設計

親コンポーネントから子コンポーネントに対して、特定の操作（状態リセット、選択クリア、生成トリガー等）を命令的に実行する必要がある場合、`useRef` + `useImperativeHandle` で子の公開 API を定義します。

#### 3.1.1 設計原則

- **責務明確化**: 子が持つべき「命令「（imperatives）を明示的なメソッドとして公開する。
- **命名規則**: メソッド名は動詞で命令形（`clearSelection`, `generateAndAddSkip`, `resetToInitial`）に統一する。
- **戻り値**: 副作用ではなく、確定状態またはデータ（例: 生成された Identity）を返す。
- **純粋性**: すべての updater 関数は副作用を含まない（[coding-standards.md セクション7参照](./coding-standards.md#7-react-state-updater-純粋性ルール)）。

#### 3.1.2 インターフェース型定義例

```typescript
// children/anonymous-name-generator.tsx
export interface AnonymousNameGeneratorHandle {
  /** 新規候補セットを生成し、最初の候補を返して選択マークを付ける */
  generateAndAddSkip: (specificSign?: string | null) => Identity;

  /** 初期状態にリセット（子コンポーネントの状態を初期フレームに戻す） */
  resetToInitial: () => void;

  /** 選択マークをクリア（親が中央で再選択したときに、右側の選択状態をリセット） */
  clearSelection: () => void;
}

`src/components` 直下は、以下の機能カテゴリを許可カテゴリとして運用する。
  Props
- `admin`
- `anonymous-name-selector`
>((props, ref) => {
  // ...
  useImperativeHandle(ref, () => ({
    generateAndAddSkip: (specificSign?: string | null) => { /* ... */ },
    resetToInitial: () => { /* ... */ },
    clearSelection: () => { /* ... */ },
  }));
  // ...
});
```

#### 3.1.3 親コンポーネント側の利用パターン

```typescript
// parent/profile-creation-wizard.tsx
const nameGeneratorReference = useRef<AnonymousNameGeneratorHandle>(null);

// 中央で候補を選び直したとき、右側の選択マークをクリア
const onCentralCandidateClick = (index: 0 | 1 | 2) => {
  setActiveCandidate(index);
  nameGeneratorReference.current?.clearSelection();
};

return (
  <>
    <AnonymousNameGenerator
      ref={nameGeneratorReference}
      // ...
    />
  </>
);
```

### 3.2 複数の「選択状態」がある場合の設計（状態同期ルール）

同じ値に対して複数の「選択位置」が存在する場合（例：中央での activeCandidate と右側での selected チェックマーク）、以下のルールで整合性を保ちます。

#### 3.2.1 「ソース・オブ・トゥルース」の明確化

| 状態変数 | 所有元 | 役割 | ルール |
|---------|------|------|--------|
| `activeCandidate` | 親 (ProfileCreationWizard) | 中央候補パネルのアクティブ候補 Index | 親で管理・更新 |
| `selected` | 子 (AnonymousNameGenerator) | 右側のチェックマーク付与位置 | 子内部で管理 |

- **ルール**: 親が中央で activeCandidate を変更したら、必ず子の selected をリセット（clearSelection）する。
- **理由**: 2つの選択位置が同時に有効だと、ユーザーの意図が曖昧になり、保存時のバグにつながる。

#### 3.2.2 同期パターン

```typescript
// 親が中央の候補ボタンをクリック
onClick={() => {
  setActiveCandidate(nextIndex);  // 親の状態を更新
  nameGeneratorReference.current?.clearSelection();  // 子の状態をリセット
}}
```

このパターンにより、ユーザーの操作フローが常に明確に追跡可能になります。

### 3.3 一時指示値（Pending Reference）パターン

子から親へのコールバック時に、「どのスロットへの追加か」「どのアイテムへのアクション か」を伝える需要がある場合、親が ref で一時指示値を保持するパターンが活用できます。

#### 3.3.1 設計例

```typescript
// 親: 「次の生成結果をスロット 1 へ入れる」指示を ref に一時保持
const pendingCandidateIndexReference = useRef<0 | 1 | 2 | null>(null);

// 親: ボタンクリック時に指示をセット
onClick={() => {
  setActiveCandidate((1 as 0 | 1 | 2));
  pendingCandidateIndexReference.current = 1;  // ← 一時指示

  // 子に生成トリガーを送る
  const generatedIdentity = nameGeneratorReference.current?.generateAndAddSkip();
}
```

```typescript
// 子: コールバック時に、親が指示した値を読み取る
const handleIdentitySelect = (identity: Identity) => {
  const capturedTargetIndex = pendingCandidateIndexReference.current;  // ← 指示読み取り
  pendingCandidateIndexReference.current = null;  // ← 指示クリア

  // 指示されたスロットに値を格納
  setFormData((prev) => {
    const targetIndex = capturedTargetIndex ?? 0;
    const updated = [...prev.zodiacCandidates];
    updated[targetIndex] = { name: identity.name, sign: identity.sign };
    return { ...prev, zodiacCandidates: updated };
  });
};
```

#### 3.3.2 留意点

- **ref 操作は updater の外で行う**: Strict Mode での二重呼び出しを防ぐため、updater 関数내に ref アクセスを含めないこと（[coding-standards.md セクション7参照](./coding-standards.md#7-react-state-updater-純粋性ルール)）。
- **一時指示値の生存期間を短く**: ref値は callback 終了直後にクリアし、複数フレーム保持しない。
