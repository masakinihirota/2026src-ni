# PDFをAI可読ドキュメント化する手順

この手順は、PDF全ページをOCRし、Webアプリ設計に再利用しやすい成果物を作るためのものです。

## 1. 事前準備（1回だけ）

1) Tesseract本体
- 既に導入済み想定: `C:\Users\hi\AppData\Local\Programs\Tesseract-OCR\tesseract.exe`

2) Tesseract日本語言語データ（`jpn`）
- `tessdata` フォルダに `jpn.traineddata` を配置してください。
- 現在環境では `eng`, `osd` のみ確認済みです。

3) Pythonライブラリ
- `PyMuPDF` が必要です。
- 実行例: `pip install pymupdf`

4) 任意: 日本語モデル未導入時の暫定実行
- `jpn` が未導入でも `eng` で暫定OCRできます（精度は低下）。

## 2. パイプライン実行

PowerShellで実行:

```powershell
powershell -ExecutionPolicy Bypass -File "u:\2026src-ni\scripts\run_pipeline.ps1" `
  -PdfPath "u:\2026src-ni\日鋼団地 全体説明会③資料 0613開催.pdf"
```

日本語モデル未導入で暫定実行する場合:

```powershell
powershell -ExecutionPolicy Bypass -File "u:\2026src-ni\scripts\run_pipeline.ps1" `
  -PdfPath "u:\2026src-ni\日鋼団地 全体説明会③資料 0613開催.pdf" `
  -FallbackToEnglish
```

MinerUで実行する場合（推奨: レイアウト・表・数式を含む解析）:

```powershell
powershell -ExecutionPolicy Bypass -File "u:\2026src-ni\scripts\run_pipeline.ps1" `
  -PdfPath "u:\2026src-ni\日鋼団地 全体説明会③資料 0613開催.pdf" `
  -Engine mineru
```

MinerUの事前インストール例:

```powershell
py -3.11 -m pip install -U "mineru[all]"
```

注: Windows では MinerU の公式案内上、Python 3.10〜3.12 が対象です。手元の既定 Python が 3.13 の場合は、`py -3.11` を使ってください。

## 3. 成果物

出力先デフォルト: `u:\2026src-ni\ai-docs`

- `ocr_full.md`
  - 全ページOCRの連結テキスト
- `manifest.json`
  - ページ画像とOCRテキストの対応表
- `structured\summary.json`
  - 棟・階・面積などの機械抽出サマリ
- `structured\summary.md`
  - 上記サマリの可読版

MinerU実行時は追加で以下が生成されます。

- `mineru_manifest.json`
  - 実行コマンド、主要出力の自動検出結果、正規化した出力先

## 4. 検証ポイント

- 抜き取り確認: ページ17/18で棟名・階数・面積が原本と一致するか
- 欠損確認: 主要ページの抽出漏れがないか
- 誤認識確認: 小数点や単位 `m²` の誤読がないか

## 5. 次工程

この成果物を入力として、以下の企画・実装に接続できます。
- 建設前: 希望住戸チェック機能
- 建設後: 匿名コミュニティ機能
