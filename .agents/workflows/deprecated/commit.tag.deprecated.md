---
description: チェック、ビルド、コミット、プッシュ、マージ、およびバージョンタグ付けを一括で行う。
---

現在のブランチ（main以外）でのビルド・動作確認、および main へのマージとリリース（バージョン更新・タグ付け）を自動または半自動で行います。

**前提条件**: コミット済みの変更があります。未コミットの変更がある場合は先に処理してください。

### 1. 現在のブランチを確認とビルド・動作確認

現在の作業ブランチ（例: `anti`）でビルドとテストを並列で実行します。

```powershell
pnpm verify:all
```

✅ すべてのチェックが pass することを確認してください。

### 2. 作業ブランチをコミットして push

ここまでの変更を push します（未完了の変更があれば先にコミットしてください）。

```bash
git push origin <working-branch>
```

### 3. main ブランチへの切り替えとマージ

```powershell
git checkout main
git pull origin main
git merge <working-branch>
```

✅ コンフリクトが発生した場合は、手動で解消し、解消後に `git add .` -> `git commit -m "chore: resolve merge conflict"` を実行してください。

### 4. main ブランチでの最終チェック (ビルドと動作確認)

マージ後の `main` ブランチで品質を最終確認します。

```powershell
pnpm verify:all
```

✅ ビルドとテストが成功することを確認してください。

### 5. main ブランチを push

```bash
git push origin main
```

### 6. バージョンアップとタグ付け

バージョンアップを行い、自動的にタグを作成します（デフォルトでパッチバージョンを上げます）。

```powershell
pnpm version patch
```

※ このコマンドにより以下が自動的に行われます：
- `package.json` のバージョン更新
- コミット作成（メッセージ: `v[新バージョン]`）
- タグ作成（タグ名: `v[新バージョン]`）

### 7. タグをリモートに push

```bash
git push origin main --tags
```

✅ main ブランチと新しいタグがリモートに push されたことを確認してください。

### 8. 元の作業ブランチに復帰

```bash
git checkout <working-branch>
```

✅ 作業ブランチに戻り、すべての操作が正常に完了したことを報告してください。
