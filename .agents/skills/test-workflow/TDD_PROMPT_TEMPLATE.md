# TDD Prompt Template

以下をCopilotへの依頼文として利用する。

```text
TDDとして実施してください。
必ず test-case-outline-generation → test-code-generation の順で進めてください。
まず describe/it.todo でアウトラインを確定し、次に同じ構造・同じケース名のまま it 実装へ変換してください。
失敗時は、テスト実装誤りなら修正、実装/仕様不整合なら it.skip + 理由 + 確認事項を提示してください。
実行コマンドは pnpm scripts を使ってください。
```

## 運用メモ

- 仕様未確定項目（同率順位、期間境界、0件時表示）がある場合は、実装前に確認する。
- 依頼文に npm run test と書かれていても、本リポジトリでは pnpm を優先する。
