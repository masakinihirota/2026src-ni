#!/usr/bin/env python3
"""Render PDF pages to images and run Tesseract OCR per page.

Usage:
  python scripts/extract_pdf_ocr.py --pdf "path/to/file.pdf" --out "outdir" --tesseract "C:/.../tesseract.exe" --lang jpn
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, text=True, capture_output=True)


def ensure_tesseract(tesseract: Path, lang: str, fallback_lang: str | None = None) -> str:
    if not tesseract.exists():
        raise FileNotFoundError(f"Tesseract not found: {tesseract}")

    proc = run([str(tesseract), "--list-langs"])
    if proc.returncode != 0:
        raise RuntimeError(f"Failed to list tesseract languages: {proc.stderr.strip()}")

    langs = {line.strip() for line in proc.stdout.splitlines() if line.strip() and "List of available languages" not in line}
    if lang in langs:
        return lang

    if fallback_lang and fallback_lang in langs:
        print(
            f"WARN: Language '{lang}' is not installed. Falling back to '{fallback_lang}'.",
            file=sys.stderr,
        )
        return fallback_lang

    raise RuntimeError(
        f"Language '{lang}' is not installed in tesseract. Available: {sorted(langs)}"
    )


def render_pdf_pages(pdf: Path, image_dir: Path, dpi: int) -> list[Path]:
    try:
        import fitz  # type: ignore
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            "PyMuPDF (fitz) is required. Install with: pip install pymupdf"
        ) from exc

    image_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf)
    page_paths: list[Path] = []

    zoom = dpi / 72.0
    matrix = fitz.Matrix(zoom, zoom)

    for idx, page in enumerate(doc, start=1):
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        out_path = image_dir / f"page_{idx:03d}.png"
        pix.save(out_path)
        page_paths.append(out_path)

    doc.close()
    return page_paths


def ocr_pages(tesseract: Path, page_paths: list[Path], text_dir: Path, lang: str, psm: int) -> list[Path]:
    text_dir.mkdir(parents=True, exist_ok=True)
    out_paths: list[Path] = []

    for page in page_paths:
        stem = page.stem
        out_base = text_dir / stem
        cmd = [
            str(tesseract),
            str(page),
            str(out_base),
            "-l",
            lang,
            "--psm",
            str(psm),
        ]
        proc = run(cmd)
        if proc.returncode != 0:
            raise RuntimeError(f"OCR failed for {page.name}: {proc.stderr.strip()}")
        out_paths.append(out_base.with_suffix(".txt"))

    return out_paths


def merge_markdown(text_paths: list[Path], output_md: Path, source_pdf: Path) -> None:
    lines: list[str] = []
    lines.append(f"# OCR抽出結果: {source_pdf.name}")
    lines.append("")
    lines.append("このファイルはページ単位のOCRテキストを連結したものです。")
    lines.append("")

    for idx, path in enumerate(text_paths, start=1):
        lines.append(f"## Page {idx}")
        lines.append("")
        text = path.read_text(encoding="utf-8", errors="ignore").strip()
        lines.append("```")
        lines.append(text)
        lines.append("```")
        lines.append("")

    output_md.parent.mkdir(parents=True, exist_ok=True)
    output_md.write_text("\n".join(lines), encoding="utf-8")


def build_manifest(pdf: Path, page_images: list[Path], page_texts: list[Path], out_json: Path) -> None:
    data = {
        "source_pdf": str(pdf),
        "pages": [
            {
                "page": i,
                "image": str(img),
                "ocr_text": str(txt),
            }
            for i, (img, txt) in enumerate(zip(page_images, page_texts), start=1)
        ],
    }
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract OCR text from PDF pages.")
    parser.add_argument("--pdf", required=True, help="Input PDF path")
    parser.add_argument("--out", required=True, help="Output directory")
    parser.add_argument("--tesseract", required=True, help="Path to tesseract.exe")
    parser.add_argument("--lang", default="jpn", help="OCR language (default: jpn)")
    parser.add_argument(
        "--fallback-lang",
        default=None,
        help="Fallback OCR language when --lang is missing (example: eng)",
    )
    parser.add_argument("--dpi", type=int, default=300, help="Render DPI (default: 300)")
    parser.add_argument("--psm", type=int, default=6, help="Tesseract page segmentation mode")
    parser.add_argument("--clean", action="store_true", help="Delete output directory before run")
    args = parser.parse_args()

    pdf = Path(args.pdf).resolve()
    out_dir = Path(args.out).resolve()
    tesseract = Path(args.tesseract).resolve()

    if not pdf.exists():
        raise FileNotFoundError(f"PDF not found: {pdf}")

    if args.clean and out_dir.exists():
        shutil.rmtree(out_dir)

    resolved_lang = ensure_tesseract(tesseract, args.lang, args.fallback_lang)

    pages_dir = out_dir / "pages"
    ocr_dir = out_dir / "ocr"

    page_images = render_pdf_pages(pdf, pages_dir, args.dpi)
    page_texts = ocr_pages(tesseract, page_images, ocr_dir, resolved_lang, args.psm)

    merge_markdown(page_texts, out_dir / "ocr_full.md", pdf)
    build_manifest(pdf, page_images, page_texts, out_dir / "manifest.json")

    print(f"Done. pages={len(page_images)} lang={resolved_lang} out={out_dir}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        raise
