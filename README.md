# 縦書き小説リーダー

`novel.txt` を縦書き・右から左のページ送りで読めるようにする静的サイトです（GitHub Pages 用）。

## 公開手順
1. このフォルダの中身（`index.html` `style.css` `app.js` `novel.txt` `cover.jpg` `.nojekyll`）をリポジトリのルートに置いて push
2. GitHub の **Settings → Pages → Build and deployment** で Source を「Deploy from a branch」、Branch を `main` / `(root)` にして Save
3. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます

## 本文の更新
`novel.txt` を書き換えるだけです。1行が1段落、章見出しは `第○章 タイトル` または `最終章 タイトル` の形式です。

## ローカル確認
`python -m http.server` を実行して http://localhost:8000 を開いてください（`file://` では本文を読み込めません）。

## 操作
- 画面左側タップ／← キー／左スワイプ：次のページ
- 画面右側タップ／→ キー／右スワイプ：前のページ
- 画面中央タップ：メニュー表示切替
- 章が変わるとき、または1ページの行数を超えたときに次のページへ移ります
