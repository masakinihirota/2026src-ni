# Test Code Generation - Agent Instructions

## 目的

提供済みアウトラインを崩さず、it.todo を実行可能な it へ実装する。

## 必須ルール

1. describe の階層構造とテストケース名は変更しない
2. すべての it.todo を it へ置換して実装する
3. テストデータ作成は関連 describe の beforeEach で行う
4. クリーンアップは同じ beforeEach 内で context.onTestFinished を使って登録する
5. AAA を厳守する（Arrange: describe/beforeEach、Act/Assert: it 内）
6. 内部モジュールへの vi.mock / vi.spyOn は禁止
7. 事後条件（戻り値 + DB状態）と不変条件（異常系でDB非変更）を必ず検証する
8. 実装後は対象テストを scripts 経由で実行する

## 禁止事項

- describe 名やケース名の改変
- Arrange を it 内へ書く
- DBの代わりに内部Repositoryをモックする
- 失敗テストを無根拠で削除する

## 判断ルール

- テスト実装ミスで失敗: テストコードを修正
- 実装仕様の不整合で失敗: 該当ケースを it.skip に変更し、理由と確認事項を提示
