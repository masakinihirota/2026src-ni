#!/usr/bin/env python3
"""Run MinerU for a PDF and normalize outputs for AI consumption.

Usage:
  python scripts/extract_pdf_mineru.py --pdf "path/to/file.pdf" --out "u:/2026src-ni/ai-docs"
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, text=True, capture_output=True)


def pick_mineru_runner(preferred: str | None = None) -> list[str]:
    cli_candidates: list[list[str]] = []
    if preferred:
        user_tokens = preferred.split()
        if user_tokens:
            if user_tokens[-1].lower() == "mineru":
                cli_candidates.append(user_tokens)
            else:
                cli_candidates.append(user_tokens + ["mineru"])

    cli_candidates.extend((["uv", "run", "mineru"], ["mineru"]))

    for candidate in cli_candidates:
        probe = subprocess.run(candidate + ["--version"], text=True, capture_output=True)
        if probe.returncode == 0:
            return candidate

    py_candidates: list[list[str]] = []
    if sys.platform.startswith("win"):
        py_candidates.extend((["py", "-3.11"], ["py", "-3.12"], ["py", "-3.10"]))
    py_candidates.append([sys.executable])

    for candidate in py_candidates:
        probe = subprocess.run(candidate + ["-c", "import mineru"], text=True, capture_output=True)
        if probe.returncode == 0:
            return candidate + ["-c", "from mineru.cli.client import main; main()"]

    raise FileNotFoundError(
        "MinerU is not importable from a supported Python interpreter. "
        "Install it with uv pip install -U \"mineru[all]\" and run via 'uv run mineru'."
    )


def select_primary_file(root: Path, ext: str) -> Path | None:
    files = [p for p in root.rglob(f"*{ext}") if p.is_file()]
    if not files:
        return None
    # Prefer larger files because they are more likely to contain full parsed content.
    return max(files, key=lambda p: p.stat().st_size)


def write_manifest(out_dir: Path, data: dict) -> None:
    manifest_path = out_dir / "mineru_manifest.json"
    manifest_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Parse PDF with MinerU and normalize outputs")
    parser.add_argument("--pdf", required=True, help="Input PDF path")
    parser.add_argument("--out", required=True, help="Output directory")
    parser.add_argument(
        "--mineru-runner",
        default=None,
        help="MinerU runner command, for example: 'py -3.11'",
    )
    parser.add_argument("--backend", default="pipeline", help="MinerU backend (default: pipeline)")
    parser.add_argument("--clean", action="store_true", help="Delete output directory before run")
    args = parser.parse_args()

    pdf = Path(args.pdf).resolve()
    out_dir = Path(args.out).resolve()

    if not pdf.exists():
        raise FileNotFoundError(f"PDF not found: {pdf}")

    mineru_runner = pick_mineru_runner(args.mineru_runner)

    if args.clean and out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    staged_pdf = pdf
    if sys.platform.startswith("win"):
        stage_dir = Path(tempfile.gettempdir()) / "mineru_stage"
        stage_dir.mkdir(parents=True, exist_ok=True)
        staged_pdf = stage_dir / "input.pdf"
        shutil.copy2(pdf, staged_pdf)

    cmd = [
        *mineru_runner,
        "-p",
        str(staged_pdf),
        "-o",
        str(out_dir),
        "-b",
        args.backend,
    ]

    proc = run(cmd)
    if proc.returncode != 0:
        raise RuntimeError(
            "MinerU parse failed.\n"
            f"command: {' '.join(cmd)}\n"
            f"stdout:\n{proc.stdout}\n"
            f"stderr:\n{proc.stderr}"
        )

    primary_md = select_primary_file(out_dir, ".md")
    primary_json = select_primary_file(out_dir, ".json")

    normalized_md = out_dir / "ocr_full.md"
    normalized_json = out_dir / "structured" / "summary.json"
    normalized_json.parent.mkdir(parents=True, exist_ok=True)

    if primary_md and primary_md.resolve() != normalized_md.resolve():
        shutil.copy2(primary_md, normalized_md)

    if primary_json and primary_json.resolve() != normalized_json.resolve():
        shutil.copy2(primary_json, normalized_json)

    summary_md = out_dir / "structured" / "summary.md"
    summary_lines: list[str] = [
        "# MinerU実行サマリ",
        "",
        f"- source_pdf: {pdf}",
        f"- staged_pdf: {staged_pdf}",
        f"- mineru_runner: {' '.join(mineru_runner)}",
        f"- backend: {args.backend}",
        f"- normalized_markdown: {normalized_md if primary_md else 'N/A'}",
        f"- normalized_json: {normalized_json if primary_json else 'N/A'}",
        "",
    ]
    summary_md.write_text("\n".join(summary_lines), encoding="utf-8")

    manifest_data = {
        "source_pdf": str(pdf),
        "staged_pdf": str(staged_pdf),
        "mineru_command": cmd,
        "backend": args.backend,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
        "primary_markdown": str(primary_md) if primary_md else None,
        "primary_json": str(primary_json) if primary_json else None,
        "normalized_outputs": {
            "ocr_full_md": str(normalized_md) if primary_md else None,
            "summary_json": str(normalized_json) if primary_json else None,
            "summary_md": str(summary_md),
        },
    }
    write_manifest(out_dir, manifest_data)

    print(
        "Done. "
        f"out={out_dir} "
        f"md={'yes' if primary_md else 'no'} "
        f"json={'yes' if primary_json else 'no'}"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
