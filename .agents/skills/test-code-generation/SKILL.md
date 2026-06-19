---
name: test-code-generation
description: 既存の describe/it.todo アウトラインを保持したまま、実行可能な Vitest テストコードへ実装するスキル。Hook運用、DB検証、契約テストを標準化。
context: fork
---

# Test Code Generation Skill

このスキルは、テストケースアウトラインから実行可能なテストコードを作るための実装規約です。

## 1. 適用シーン

- すでに describe + it.todo のアウトラインがある
- TDD の RED フェーズで、実行可能テストへ昇格したい
- DB状態検証を含む状態ベーステストを統一したい

## 2. 絶対要件

1. describe 構造を維持する
2. テスト名（仕様意図）を維持する
3. it.todo を it へ置換する
4. テスト完了後に対象テストを scripts 経由で実行する

## 2.1 開始チェックリスト（必須）

- [ ] アウトラインが `test-case-outline-generation` で作成済み
- [ ] `describe` 構造とケース名を改変しないことを確認
- [ ] 仕様不明点を解消済み（不明なら実装前に確認）
- [ ] 対象テスト実行コマンド（pnpm scripts）を確定

## 3. Hook とデータライフサイクル

### 3.1 原則

- テストデータの作成は、共有コンテキストの describe 内 beforeEach で行う
- 削除は同じ beforeEach で `context.onTestFinished` を使って登録する
- これにより Test Isolation を保証する

### 3.2 推奨テンプレート

```ts
import { beforeEach, describe, it } from "vitest";

describe("対象機能", () => {
  let createdId: string;

  beforeEach(async (context) => {
    // Arrange: shared setup
    createdId = await createRecord();

    context.onTestFinished(async () => {
      await deleteRecord(createdId);
    });
  });

  it("正常入力の時、保存されること", async () => {
    // Act
    const result = await executeUseCase(createdId);

    // Assert
    expect(result.ok).toBe(true);
  });
});
```

補足: Vitest公式の Hooks API では `onTestFinished` をテスト実行コンテキストで使うことが推奨される。beforeEach の context 経由で使うと、並列時の安全性も担保しやすい。

## 4. AAA 運用ルール

- Arrange: describe スコープ変数 + beforeEach で準備
- Act: it 内で対象振る舞いを1回だけ実行
- Assert: it 内で事後条件と不変条件を検証

重要: 本プロジェクト運用では Arrange を it 内へ書かない。

## 5. モック方針

### 5.1 禁止

- 内部モジュール（Repository/API Client）への `vi.mock` / `vi.spyOn`

### 5.2 許容・推奨

- DB は実DB + ORM で検証
- 外部HTTPは Docker 上 prism サーバを利用

## 6. Design by Contract 検証

### 6.1 事後条件

Act の結果に対して、必ず以下の2軸をアサートする。

- 出力値（戻り値）
- DB更新後状態（SELECT結果）

### 6.2 不変条件

異常系では、必ず以下を両方アサートする。

- 期待エラーが発生する
- DB状態が Act 前後で不変

## 7. 失敗時の分岐

- テスト実装誤り: テストコードを修正して再実行
- 実装/仕様矛盾: そのケースを `it.skip` 化し、理由・影響・確認事項をユーザーへ提示

固定テンプレート:

```ts
it.skip("[ケース名を維持]", () => {
  // TODO: 実装/仕様不整合のため一時スキップ。
  // 理由: ...
  // 確認事項: ...
});
```

## 8. テスト実行ルール

このリポジトリでは scripts 経由で実行する。

- 推奨: `pnpm test:run -- <test-file>`
- 代替: `pnpm test -- <test-file>`

注意: 依頼文に `npm run test <test-file>` とあっても、実運用は `pnpm` を優先する。

## 9. テストユーティリティ方針

- `src/test-utils/` を優先利用する
- 必要なら不足ユーティリティを追加・改修する
- 同種テストが増えたら共通ユーティリティへ再抽象化する
