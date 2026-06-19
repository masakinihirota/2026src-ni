# Strict Mode Updater Safety - Agent Instructions

## 目的

React Strict Mode で顕在化する updater 非純粋性バグを、短いサイクルで再発防止する。

## エージェント必須ルール

1. まず失敗テストを1件作る（RED）
2. updater を純粋関数へ変換する（GREEN）
3. 連続操作テストを最低1件追加する（回帰固定）

## 検出時の禁止事項

- updater 内で ref を読み書きする
- updater 内で外部 mutable 変数を変更する
- updater 内で API 呼び出しや logger 送信を行う
- updater 内で Date.now / Math.random を直接呼ぶ

## 推奨手順

- mutable 入力を updater 外で先に確定
- updater は prev から next を返すだけに限定
- StrictMode ラップでテストを実行

## 最低限の成果物

- 修正前に失敗するテスト
- 修正後に成功する最小実装
- 2回連続操作の回帰テスト
