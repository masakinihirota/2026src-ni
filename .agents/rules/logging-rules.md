---
trigger: always_on
---

# ログ出力ルール

## 共通テンプレート

### 目的
- ログ出力形式を統一し、監視・調査・監査を容易にする。

### 必須
- アプリケーションコードでは `logger.*` を使用する。
- エラー時は `Error` オブジェクトと文脈情報を可能な限り記録する。

### 禁止
- `console.*` の直接使用（許可された例外を除く）。

### 例外
- `logger` 実装自身、テストコード、明示許可スクリプトは例外とする。

### 参照
- [セキュリティ・アーキテクチャ](./security-architecture.md)
- [厳格なコード審査基準](./strict-review-standards.md)

## 目的

アプリケーションコードのログ出力を `logger.*` に統一し、出力形式・文脈情報・監視連携を一貫させることを目的とします。

## 必須ルール

- アプリケーションコードでは必ず `logger.*` を使用すること。
- `console.log`, `console.error`, `console.warn`, `console.info`, `console.debug`, `console.trace` を含む `console.*` の使用を禁止すること。
- 一時調査用の出力、デバッグ出力、例外出力も含めて `logger.*` に統一すること。
- エラーハンドリングでは、可能な限り `Error` オブジェクトと補足コンテキストを `logger.error` に渡すこと。

## 例外

- `logger` 実装自身
- テストコード
- 明示的に許可されたスクリプト

## 推奨パターン

```ts
logger.error(
  "Failed to save onboarding data",
  error instanceof Error ? error : undefined,
  { cause: String(error) }
)
```

- **実装場所**: `src/lib/logger.ts` をインポート元とすること（例: `import { logger } from "@/lib/logger"`）。

## 補足

- **pre-commit 検証**: コミット前チェックでは staged files に対して `console.*` 検出が走ります。
  - 実装ファイル: `.git/hooks/pre-commit` または `scripts/pre-commit.sh`
  - 例外が必要な場合は、スクリプト側 allowlist の妥当性を明示してから追加すること。
  - **注**: pre-commit スクリプトが実装されていない場合、ESLint `no-console` ルールのみで運用する。
- ESLint の `no-console` ルールと pre-commit の検出スクリプトの両方を可能な限り並行運用してください。
