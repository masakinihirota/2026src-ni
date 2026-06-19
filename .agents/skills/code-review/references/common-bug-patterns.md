# よくあるバグパターン集

## 1. SQLインジェクション
テンプレートリテラルやstring concatenationでSQL文を組み立てている場合。
```typescript
// NG
db.query(`SELECT * FROM users WHERE name = '${name}'`)
// OK
db.query("SELECT * FROM users WHERE name = $1", [name])
```

## 2. XSS（クロスサイトスクリプティング）
ユーザー入力をHTMLレスポンスにそのまま埋め込んでいる場合。
```typescript
// NG
res.send(`<h1>${userInput}</h1>`)
// OK
res.send(`<h1>${escapeHtml(userInput)}</h1>`)
```

## 3. Off-by-oneエラー
配列のループで `<=` を使っている場合、最後の要素の次にアクセスしてundefinedになる。
```typescript
// NG
for (let i = 0; i <= arr.length; i++)
// OK
for (let i = 0; i < arr.length; i++)
```

## 4. null/undefined参照
DBクエリの結果やオプショナルなプロパティを、存在チェックなしでアクセスしている場合。
```typescript
// NG
const bio = user.profile.bio  // userやprofileがnullの可能性
// OK
const bio = user?.profile?.bio ?? "No bio"
```

## 5. N+1クエリ問題
ループ内で個別にDBクエリを発行している場合。JOINやIN句でまとめて取得すべき。
```typescript
// NG
for (const user of users) {
  const posts = await db.query("SELECT * FROM posts WHERE user_id = $1", [user.id])
}
// OK
const posts = await db.query("SELECT * FROM posts WHERE user_id = ANY($1)", [userIds])
```

## 6. ループ内の不要な再計算
ループの反復ごとに同じ値を計算している場合。ループ外に移動すべき。

## 7. マジックナンバー
意味不明な数値リテラルが条件分岐に使われている場合。定数として名前を付けるべき。

## 8. 関数の責務過多
1つの関数がバリデーション、DB操作、外部API呼び出し、レスポンス生成など複数の責務を持っている場合。

## 9. any型の乱用
TypeScriptで`any`を使うと型チェックが無効化される。`unknown`+型ガードを使うべき。

## 10. catch節の握りつぶし
空のcatchブロックでエラーを無視している場合。最低限ログ出力すべき。
