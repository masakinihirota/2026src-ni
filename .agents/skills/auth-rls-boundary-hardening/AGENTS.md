# Auth RLS Boundary Hardening - Agent Instructions

## 目的

Better Auth と RLS 境界の事故を予防し、再発防止型で閉じる。

## 必須ルール

1. 資格情報は fail-fast（フォールバック禁止）
2. RLS設定前に authUserId を必ず検証
3. セッション失敗は監査ログへ記録
4. 最小回帰テストを追加して固定化

## 禁止事項

- 本番でデフォルトクレデンシャルを使う
- 空文字/未定義のauthUserIdを set_config する
- 認証失敗を黙殺する

## 推奨手順

- RED: 失敗ケースを1件作る
- GREEN: 最小修正で通す
- REFACTOR: 共通化できる検証のみ整理
