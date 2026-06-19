---
description: 未コミット変更を自動コミットし、main/dev の2つのブランチを同期、マイナーバージョンを上げてタグ付け・GitHub / GitLab プッシュまで全自動で行う
---

# 2ブランチ（main, dev）同期ワークフロー

あなたの目的は、未コミットの変更を自動的にコミットしたうえで、`main`, `dev` の2つのブランチが全く同じコミット履歴（状態）になるように、相互にマージして同期（シンクロ）させ、マイナーバージョンを1つ上げて GitHub / GitLab へプッシュするまでを**全自動**で完結させることです。

> **バックアップ構成**: `origin` の push 先は GitHub と GitLab の2箇所に設定されています。`git push origin` を1回実行するだけで両リポジトリへ自動的に同期されます。pre-push フックがこの二重構成を強制チェックするため、片方だけ送られる事故を防ぎます。
ユーザーは一人開発であり、使用するツールごとにブランチを使い分けています。このワークフローを使って任意のタイミングでそれらを一つにまとめます。

## 追加機能（この版で必須）

- 未コミットの変更が存在する場合は、**ユーザー確認なし**で自動的にコミットすること（コミットメッセージは変更内容から自動生成）
- **マイナーバージョンを必ず1つ上げる**（タグが衝突しない場合も含め、常に `pnpm version minor --no-git-tag-version` を実行する）
- `package.json` の `version` を基準にタグ（例: `v0.4.3`）を作成し GitHub へプッシュすること
- **同期やタグPushの前に、pre-push / pre-commit 相当のエラーを必ず解消すること**
- **`--no-verify` を使ってフックを迂回しないこと**。フックで止まる場合は、止めている原因を修正してから再実行すること
- 2ブランチが既に同一コミットなら、同期処理をスキップして「バージョン引き上げ＋タグ付け」を実行すること
- 2ブランチが不一致なら、進んでいる側（最新コミット側）へ寄せて同期すること
- 同名タグが異なるコミットを指している場合は、さらに `pnpm version minor --no-git-tag-version` を再実行して新タグを作成すること（既存タグの付け替えは禁止）

## 前提条件と注意点
- ユーザーは `git worktree` を使用している可能性があります（例: `dev` ディレクトリにいる）。
- worktree環境では、別ディレクトリでチェックアウトされているブランチに `git checkout` できない場合があります。
- そのため、このワークフローでは直接 `checkout` せず、現在のブランチで全てを統合し、その結果をリモートの各ブランチに `push` する安全な方法を取ります。
- `git branch -f` は worktree 使用中ブランチに対して失敗しうるため、失敗してもリモートSHA一致を優先して完了判定する。
- **正解コミット（canonical）は常に「現在いるブランチの `HEAD`」とする。**
- 特定ブランチ（例: `dev`）を固定で正としない。ユーザーがどのブランチで実行しても、その時点の `HEAD` を正として `main/dev` を合わせる。
- ただし **canonical な `HEAD` 自体に lint / type-check / test / secret scan エラーがある場合、その `HEAD` をそのまま正として同期してはいけない**。先にエラー原因を修正し、検証を通した `HEAD` を正とすること。

## フック回避の禁止

- `git commit --no-verify`、`git push --no-verify`、`HUSKY=0` など、Git hooks を迂回する手段は使わないこと。
- 例外は、**ユーザーが明示的に「フックを無視して進めてよい」と指示した場合のみ**。
- フックが失敗した場合は、その失敗ログを解析し、原因となっているコード・設定・型・テストを修正してから同じコマンドを再実行すること。

## 同期前の品質ゲート（新規追加・必須）

同期・タグ作成・Push を行う前に、現在の `HEAD` が最低限の品質ゲートを通過していることを確認する。

### 実行順序

1. secret scan（例: pre-push で使う gitleaks 相当）
2. lint
3. type-check
4. changed tests / workflow で要求されるテスト

### 判定ルール

- 1つでも失敗したら、**同期処理へ進まず**に修正フェーズへ入ること。
- 修正フェーズでは、失敗ログに基づいて該当箇所を修正し、**同じ検証コマンドを再実行**して通過を確認すること。
- 既存の広域エラーであっても、今回の同期を成立させるために必要なら修正対象に含めること。
- どうしても自動修正で収束しない場合のみ、どのチェックが何で失敗しているかを明記して停止すること。
- 品質ゲート未通過のまま、同期・タグ作成・Push に進んではならない。

## 自動コミットメッセージ生成ルール

`git diff --stat HEAD` および `git status --short` の出力を解析し、以下のルールで Conventional Commits 形式のメッセージを自動生成する。

| 変更の主な種類 | プレフィックス例 |
|---|---|
| 新規ファイルのみ | `feat: add <ファイル名/機能名>` |
| 既存ファイルの修正のみ | `fix: update <ファイル名/機能名>` |
| テストファイルのみ | `test: update tests for <対象>` |
| ドキュメント・mdのみ | `docs: update <ファイル名>` |
| 設定ファイルのみ | `chore: update config <ファイル名>` |
| 複数種類が混在 | `chore: sync working changes` |

- 変更ファイル数が多い（5ファイル超）場合は `chore: sync working changes (<N> files changed)` を使う。
- コミットメッセージにユーザー確認は行わず、生成したメッセージをそのまま使用する。

## 同期判定ルール

1. `origin/main`, `origin/dev` の SHA を取得して比較する。
2. 2つが同一なら「同期済み」と判定する。
3. 2つが不一致の場合は、`git merge-base --is-ancestor` で祖先関係を確認し、先行している側を正とする。
4. 祖先関係で判定できない分岐（双方に独自コミットあり）の場合は通常の相互マージに進む。

## 手順

1. **未コミット変更の自動コミット（新規追加・必須）**
   - `git status --short` を実行し、未コミットの変更（Untracked / Modified / Staged）を確認する。
   - 変更が存在する場合は**ユーザー確認なし**で以下を実行する:
     - `git add -A`
     - 「自動コミットメッセージ生成ルール」に従いメッセージを決定する
     - `git commit -m "<生成したメッセージ>"`
   - 変更が存在しない場合はこのステップをスキップする。

2. **最新情報の取得**
   - リモートの最新の状況を取得します。
   // turbo
   - 実行: `git fetch origin`

3. **同期前の品質ゲート実行（新規追加・必須）**
   - 現在の `HEAD` に対して「同期前の品質ゲート」を実行する。
   - いずれかのチェックが失敗した場合:
     - 失敗原因を修正する
     - 同じチェックを再実行する
     - 全て通るまで Step 4 へ進まない

4. **ブランチ同期状態の判定（追加）**
   - 実行（例）:
     - `git rev-parse origin/main`
     - `git rev-parse origin/dev`
   - 判定:
     - 2つ同一: Step 8（タグ処理）へ進む（同期処理は不要）
     - 不一致かつ一方が他方の祖先: Step 5-B（片側追従同期）へ進む
     - それ以外: Step 5-A（相互マージ同期）へ進む
    - 補足:
       - `origin/main`, `origin/dev` が同一でも、現在の `HEAD` と異なる場合は Step 6 を実行して `HEAD` に揃える。

5-A. **現在のブランチへの統合（相互マージ）**
   - 取得した `main`, `dev` の情報を現在のブランチにマージします。
   // turbo
   - 実行: `git merge origin/main origin/dev`（現在のブランチがどれであっても対応できるようにします）
   - ※ マージコンフリクトが発生した場合は作業を中断し、ユーザーに状況を伝えてコンフリクト解決を行ってください。
   - マージ完了後は、再度 Step 3 の品質ゲートを実行し、通過を確認してから次へ進むこと。

5-B. **不一致時の追従同期（追加）**
   - 方針: 原則として現在の `HEAD` を正として相手ブランチを合わせる。
   - 例外: ユーザーが明示的に「HEADを使わない」指示をした場合のみ、その指示に従う。
   - 実行（例）:
     - `git push origin <正SHA>:main`
     - `git push origin <正SHA>:dev`
   - これで2ブランチを同一SHAへ揃える。

6. **統合結果の各ブランチへの反映 (Push)**
   - 全ての変更が統合された状態（現在のHEAD）を、リモートの `main`, `dev` ブランチ全てへ反映します。
   - `origin` の push 先は GitHub と GitLab の2箇所のため、以下の1コマンドで両リポジトリへ同時に送信されます。
   // turbo-all
   - 実行: `git push origin HEAD:main`
   - 実行: `git push origin HEAD:dev`
   - non-fast-forward で拒否された場合は、まず `git fetch origin` して差分理由を確認し、必要な修正・再統合を行う。
   - その上で履歴同期のために強制更新が必要な場合のみ、`--force-with-lease` を使って安全に同期する。

7. **ローカルブランチのポインタ更新（可能な場合）**
   - Worktreeの影響で失敗する可能性があるため慎重に行いますが、同期したリモートに合わせてローカルブランチも更新します。
   // turbo-all
   - 実行: `git branch -f main origin/main`
   - 実行: `git branch -f dev origin/dev`

8. **マイナーバージョンの引き上げ（新規追加・必須）**
   - タグの衝突有無にかかわらず、**常に** `pnpm version minor --no-git-tag-version` を実行してマイナーバージョンを1つ上げる。
   - 実行後、`package.json` の変更をコミットする:
     - `git add package.json`
     - `git commit -m "chore: bump minor version to v<newVersion>"`
   - このコミットを `origin/main` と `origin/dev` へ push する（Step 9 と合わせて実施）。
   - version bump 後も、再度 Step 3 の品質ゲートを実行し、通過を確認してから push / tag に進むこと。

9. **package.json の version とタグ整合**
   - Step 8 で更新した version を読み取り、タグ名を `v<version>` とする。
   - 実行（例）:
     - `node -p "require('./package.json').version"`
     - `git tag -l "v<version>"`
     - `git tag -a v<version> -m "release: v<version>"`
     - `git push origin v<version>`  ← GitHub と GitLab の両方へ同時に送信される
   - 既に同名タグが存在する場合（Step 8 後でも衝突する稀なケース）:
     - 同一コミットなら成功扱い
     - 異なるコミットなら `pnpm version minor --no-git-tag-version` を再実行して同様の手順で新タグを作成する
     - 既存タグの削除・付け替えは行わない
   - タグ push 前にも、必要なら Step 3 の品質ゲートを再確認すること。

10. **タグのみ実行モード**
   - 2ブランチが同期済み（Step 4で同一SHA）かつ、コード同期不要の場合に使う。
   - ただし Step 3 の品質ゲートは省略しない。
   - 手順: Step 3 → Step 8 → Step 9 のみ実行して終了する。

11. **完了報告**
    - 以下を必ず報告する:
      - `origin/main`, `origin/dev` の最終SHA
      - 自動コミットしたメッセージ（該当した場合）
      - `package.json` の新バージョン
      - 作成したタグ（例: `v0.4.3`）
      - `git branch -f` の失敗有無（失敗時はworktree制約として記録）
      - 品質ゲートで検出・修正したエラーの要約
      - **GitHub / GitLab ハッシュ一致確認**（以下のコマンドを実行して3者一致を確認する）:
        ```
        $branch=(git rev-parse --abbrev-ref HEAD).Trim()
        $local=(git rev-parse HEAD).Trim()
        $gh=((git ls-remote https://github.com/masakinihirota/vns-masakinihirota.git "refs/heads/$branch") | ForEach-Object { ($_ -split "\s+")[0] }).Trim()
        $gl=((git ls-remote git@gitlab.com:masakinihirota/vns-masakinihirota.git "refs/heads/$branch") | ForEach-Object { ($_ -split "\s+")[0] }).Trim()
        "GitHub match: $($local -eq $gh)"  # True であること
        "GitLab match: $($local -eq $gl)"  # True であること
        ```
      - どちらか `False` の場合は、手動で `git push origin HEAD:<ブランチ名>` を再実行して解消する。
