param(
  [Parameter(Mandatory = $true)][string]$PdfPath,
  [string]$OutDir = "u:\2026src-ni\ai-docs",
  [string]$TesseractPath = "C:\Users\hi\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
  [string]$Language = "jpn",
  [switch]$FallbackToEnglish
)

$ErrorActionPreference = "Stop"

function Assert-Command {
  param([string]$Cmd)
  if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) {
    throw "Command not found: $Cmd"
  }
}

if (-not (Test-Path $PdfPath)) {
  throw "PDF not found: $PdfPath"
}

if (-not (Test-Path $TesseractPath)) {
  throw "Tesseract not found: $TesseractPath"
}

Assert-Command "python"

python -c "import fitz" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "PyMuPDF (fitz) is not installed. Run: pip install pymupdf"
}

$fallbackArgs = @()
if ($FallbackToEnglish.IsPresent) {
  $fallbackArgs = @("--fallback-lang", "eng")
}

Write-Host "[1/3] Running OCR extraction..."
python "u:\2026src-ni\scripts\extract_pdf_ocr.py" `
  --pdf "$PdfPath" `
  --out "$OutDir" `
  --tesseract "$TesseractPath" `
  --lang "$Language" `
  @fallbackArgs `
  --clean
if ($LASTEXITCODE -ne 0) {
  throw "Step 1 failed: OCR extraction"
}

Write-Host "[2/3] Building structured dataset..."
python "u:\2026src-ni\scripts\build_structured_dataset.py" `
  --ocr-dir "$OutDir\ocr" `
  --out-json "$OutDir\structured\summary.json" `
  --out-md "$OutDir\structured\summary.md"
if ($LASTEXITCODE -ne 0) {
  throw "Step 2 failed: Structured dataset build"
}

Write-Host "[3/3] Done"
Write-Host "- OCR full text: $OutDir\ocr_full.md"
Write-Host "- Structured JSON: $OutDir\structured\summary.json"
Write-Host "- Structured Markdown: $OutDir\structured\summary.md"
