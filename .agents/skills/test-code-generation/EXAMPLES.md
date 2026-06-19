# Examples

## 1. アウトラインから実装へ変換する手順

- describe 構造を保持する
- it.todo を同名の it に置換する
- beforeEach に共通 Arrange を集約する
- beforeEach の context.onTestFinished で cleanup を登録する
- it には Act/Assert のみを置く

## 2. 変換後テンプレート

```ts
import { beforeEach, describe, expect, it } from "vitest";

describe("テンプレート利用ランキング集計", () => {
  let baselineRows: number;

  beforeEach(async (context) => {
    // Arrange: shared setup for this describe
    baselineRows = await countTemplateUsageRows();

    const insertedIds = await seedTemplateUsageForPast7Days();

    context.onTestFinished(async () => {
      await deleteTemplateUsageRows(insertedIds);
    });
  });

  describe("仕様制約", () => {
    it("21件以上の結果がある時、ランキング上位20件のみ返すこと", async () => {
      // Act
      const output = await aggregateTemplateUsageRanking({});

      // Assert: 事後条件（出力値）
      expect(output.rankings.length).toBe(20);

      // Assert: 事後条件（DB状態）
      const afterRows = await countTemplateUsageRows();
      expect(afterRows).toBeGreaterThanOrEqual(baselineRows);
    });

    it("開始日が終了日より後の時、仕様どおりにエラーまたは補正されること", async () => {
      // Act
      const act = () =>
        aggregateTemplateUsageRanking({
          from: "2026-03-25",
          to: "2026-03-10",
        });

      // Assert: 不変条件（エラー）
      await expect(act()).rejects.toThrow();

      // Assert: 不変条件（DB非変更）
      const afterRows = await countTemplateUsageRows();
      expect(afterRows).toBeGreaterThanOrEqual(baselineRows);
    });
  });
});
```

## 3. it.skip へ分岐する条件

- 要件と実装の契約が衝突し、テストでは解決できない
- 期待仕様の意思決定が未確定

その場合は、次の形式で残す。

```ts
it.skip("同率時に作成日昇順で並ぶこと", () => {
  // TODO: 現行実装は同率時の並び順仕様が未確定。
  // 要件確定後に有効化する。
});
```
