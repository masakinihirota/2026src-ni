#!/usr/bin/env python3
"""Build structured JSON/Markdown from OCR output.

This parser is conservative: it extracts robust tokens and keeps traceability to page text.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

BUILDING_PATTERN = re.compile(r"([SN])\s*[-ー−‐~]?\s*([1-4])", re.IGNORECASE)
FLOOR_PATTERN = re.compile(r"\b(1[0-4]|[1-9])\b")
AREA_PATTERN = re.compile(r"\b(\d{2}\.\d{2})\s*(?:m[2²]?|㎡)", re.IGNORECASE)

NORMALIZE_TABLE = str.maketrans(
    {
        "Ｓ": "S",
        "ｓ": "s",
        "Ｎ": "N",
        "ｎ": "n",
        "０": "0",
        "１": "1",
        "２": "2",
        "３": "3",
        "４": "4",
        "５": "5",
        "６": "6",
        "７": "7",
        "８": "8",
        "９": "9",
        "－": "-",
        "ー": "-",
        "−": "-",
        "‐": "-",
    }
)


def read_page_texts(ocr_dir: Path) -> list[tuple[int, str]]:
    files = sorted(ocr_dir.glob("page_*.txt"))
    out: list[tuple[int, str]] = []
    for f in files:
        num = int(f.stem.split("_")[1])
        out.append((num, f.read_text(encoding="utf-8", errors="ignore")))
    return out


def extract_entities(page_num: int, text: str) -> dict:
    normalized = text.translate(NORMALIZE_TABLE)

    buildings = sorted({f"{letter.upper()}-{digit}" for letter, digit in BUILDING_PATTERN.findall(normalized)})
    floors = sorted(set(int(x) for x in FLOOR_PATTERN.findall(normalized)))
    areas = sorted(set(float(x) for x in AREA_PATTERN.findall(normalized)))
    return {
        "page": page_num,
        "buildings_detected": buildings,
        "floors_detected": floors,
        "areas_detected_m2": areas,
        "text_excerpt": "\n".join(text.splitlines()[:40]),
    }


def write_markdown(summary: dict, out_md: Path) -> None:
    lines: list[str] = []
    lines.append("# 構造化サマリ（自動抽出）")
    lines.append("")
    lines.append("このファイルはOCRテキストからの機械抽出結果です。")
    lines.append("誤認識が含まれる可能性があるため、ページ参照で確認してください。")
    lines.append("")

    lines.append("## 全体")
    lines.append("")
    lines.append(f"- 対象ページ数: {summary['page_count']}")
    lines.append(f"- 検出棟: {', '.join(summary['all_buildings']) if summary['all_buildings'] else 'なし'}")
    lines.append("")

    lines.append("## ページ別")
    lines.append("")
    for p in summary["pages"]:
        lines.append(f"### Page {p['page']}")
        lines.append(f"- 棟: {', '.join(p['buildings_detected']) if p['buildings_detected'] else 'なし'}")
        lines.append(f"- 階: {', '.join(str(x) for x in p['floors_detected']) if p['floors_detected'] else 'なし'}")
        lines.append(
            f"- 面積(m2): {', '.join(f'{x:.2f}' for x in p['areas_detected_m2']) if p['areas_detected_m2'] else 'なし'}"
        )
        lines.append("")

    out_md.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build structured dataset from OCR text files")
    parser.add_argument("--ocr-dir", required=True, help="Directory containing page_XXX.txt files")
    parser.add_argument("--out-json", required=True, help="Output JSON path")
    parser.add_argument("--out-md", required=True, help="Output Markdown path")
    args = parser.parse_args()

    ocr_dir = Path(args.ocr_dir).resolve()
    out_json = Path(args.out_json).resolve()
    out_md = Path(args.out_md).resolve()

    page_texts = read_page_texts(ocr_dir)
    pages = [extract_entities(page_num, text) for page_num, text in page_texts]

    all_buildings = sorted({b for p in pages for b in p["buildings_detected"]})

    summary = {
        "page_count": len(pages),
        "all_buildings": all_buildings,
        "pages": pages,
    }

    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_md.parent.mkdir(parents=True, exist_ok=True)

    out_json.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    write_markdown(summary, out_md)

    print(f"Done. pages={len(pages)} out_json={out_json} out_md={out_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
