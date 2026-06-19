# Non-Review Workflows Guide

review 以外の workflow の使い分けガイドです。
日常運用で使うものだけを残し、重複していた総合作業系 workflow は退役しました。

## 現役で使う workflow

1. 設計書とAI設計の同期
   - sync-design.prompt.md
2. ブランチ同期とタグ整合
   - sync-branches.prompt.md
3. 利用者向けドキュメント生成
   - generate-user-docs.prompt.md
4. .agents 自体のメンテナンス
   - maintain-agents.prompt.md
5. 今日と今週の計画作成
   - plan-today.prompt.md
6. 不要ログ・一時ファイルの整理
  - ボーイスカウトルール.prompt.md
7. AI開発運用の標準実行
  - ai-dev-standard.prompt.md

## 用途別マップ

### A. 同期系

- sync-design.prompt.md
  - 設計書、rules、ai-design の同期

- sync-branches.prompt.md
  - main / dev / anti の同期とタグ整合

### B. 生成・保守系

- generate-user-docs.prompt.md
  - 利用者向けドキュメント生成

- maintain-agents.prompt.md
  - .agents の棚卸し、統合、更新

### C. 計画系

- plan-today.prompt.md
  - 今日と今週の開発計画、進捗確認

### D. クリーンアップ系

- ボーイスカウトルール.prompt.md
  - 不要ログ、一時ファイル、AI生成の作業残骸を安全に整理

### E. AI開発標準化

- ai-dev-standard.prompt.md
  - 並列レビュー、変更点限定テスト、テストアウトライン先行、修正+検証、設計同期を一括運用
  - 設計反映先を `u:\2026src\vns-masakinihirota-ai-design\` に固定

## 退役した workflow と置き換え先

- boyscout.deprecated.md
  - 理由: 役割が広すぎ、review や個別修正依頼と衝突する
  - 置き換え先: review-page-route / ボーイスカウトルール / 直接チャット依頼

- boyscout-all.deprecated.md
  - 理由: 対象が広すぎて重く、日常運用に向かない
  - 置き換え先: review-page-route / maintain-agents / ボーイスカウトルール

- checkpoint.deprecated.md
  - 理由: review、cleanup、sync、tagging を一度に抱えすぎて責務過多
  - 置き換え先: review-diff-main-strict / sync-branches / ボーイスカウトルール

- commit.tag.deprecated.md
  - 理由: sync-branches と役割が重複する
  - 置き換え先: sync-branches

- fix-cursor-pointer-hover.deprecated.md
  - 理由: 単機能すぎて専用 workflow にする価値が低い
  - 置き換え先: 直接チャット依頼

## 迷ったときの選択ルール

1. 設計書の同期なら sync-design
2. ブランチやタグなら sync-branches
3. docs 生成なら generate-user-docs
4. .agents 整理なら maintain-agents
5. 今日の予定なら plan-today
6. 不要ログや一時ファイルの掃除なら ボーイスカウトルール
7. 品質を上げつつ速度も維持したいなら ai-dev-standard
