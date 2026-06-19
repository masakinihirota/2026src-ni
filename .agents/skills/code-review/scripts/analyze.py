"""
簡易コード分析スクリプト
コードの基本的な統計情報を収集する
"""
import sys
import re
import math
from pathlib import Path


FLAG_KEYS = (
    "any_count",
    "todo_count",
    "empty_catch",
    "template_literal_in_query",
    "loop_with_await",
    "magic_numbers",
    "dangerously_set_inner_html",
    "auth_boundary_todo",
)


def calculate_risk_score(filepath: str, stats: dict) -> int:
    """検出値を重み付けしてレビュー優先度スコアを返す。"""
    path = filepath.replace("\\", "/")
    is_test_file = "__tests__/" in path or path.endswith(".test.ts") or path.endswith(".test.tsx")
    is_high_risk_area = (
        "/src/lib/auth/" in path
        or "/src/lib/api/" in path
        or "/src/lib/db/" in path
        or "/src/lib/env" in path
        or "/src/app/api/" in path
    )

    weights = {
        "any_count": 2,
        "todo_count": 2,
        "empty_catch": 5,
        "template_literal_in_query": 6,
        "loop_with_await": 4,
        "magic_numbers": 1,
        "dangerously_set_inner_html": 3,
        "auth_boundary_todo": 5,
    }

    score = 0.0
    for key, weight in weights.items():
        count = stats.get(key, 0)
        if key == "any_count" and is_test_file:
            score += count * 0.5
        else:
            score += count * weight

    if is_high_risk_area and score > 0:
        score *= 1.5

    return math.ceil(score)


def classify_priority(score: int) -> str:
    if score >= 15:
        return "🔴 高"
    if score >= 6:
        return "🟡 中"
    if score > 0:
        return "🟢 低"
    return "-"


def analyze(filepath: str) -> dict:
    code = Path(filepath).read_text(encoding="utf-8")
    lines = code.split("\n")

    stats = {
        "total_lines": len(lines),
        "blank_lines": sum(1 for l in lines if l.strip() == ""),
        "comment_lines": sum(1 for l in lines if l.strip().startswith("//")),
        "functions": len(re.findall(r"(?:function |async function |(?:app\.(?:get|post|put|delete)))", code)),
        "any_count": len(re.findall(r":\s*any\b", code)),
        "todo_count": len(re.findall(r"TODO|FIXME|HACK|XXX", code, re.IGNORECASE)),
        "empty_catch": len(re.findall(r"catch\s*\([^)]*\)\s*\{\s*\}", code)),
        "template_literal_in_query": len(re.findall(r"query\s*\(\s*`", code)),
        "loop_with_await": len(re.findall(r"for\s*\([^)]*\)[^}]*await\s", code, re.DOTALL)),
        "magic_numbers": len(re.findall(r"===\s*\d+(?!\s*\))", code)),
        "dangerously_set_inner_html": len(re.findall(r"dangerouslySetInnerHTML", code)),
        "auth_boundary_todo": len(
            re.findall(r"TODO.*userProfileId.*暫定|暫定的に\s*users\.id", code, re.IGNORECASE)
        ),
    }

    stats["risk_score"] = calculate_risk_score(filepath, stats)
    stats["risk_priority"] = classify_priority(stats["risk_score"])
    return stats


def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze.py <filepath>")
        sys.exit(1)

    filepath = sys.argv[1]
    stats = analyze(filepath)

    print("=" * 50)
    print("📊 コード分析レポート")
    print("=" * 50)
    for key, value in stats.items():
        label = {
            "total_lines": "総行数",
            "blank_lines": "空行数",
            "comment_lines": "コメント行数",
            "functions": "関数/エンドポイント数",
            "any_count": "any型の使用回数",
            "todo_count": "TODO/FIXME数",
            "empty_catch": "空のcatchブロック数",
            "template_literal_in_query": "テンプレートリテラルのクエリ数",
            "loop_with_await": "ループ内awaitの数",
            "magic_numbers": "マジックナンバー数",
            "dangerously_set_inner_html": "dangerouslySetInnerHTML数",
            "auth_boundary_todo": "認可境界TODO数",
            "risk_score": "レビュー優先度スコア",
            "risk_priority": "レビュー優先度",
        }.get(key, key)
        flag = " ⚠️" if key in FLAG_KEYS and isinstance(value, int) and value > 0 else ""
        print(f"  {label}: {value}{flag}")
    print("=" * 50)


if __name__ == "__main__":
    main()
