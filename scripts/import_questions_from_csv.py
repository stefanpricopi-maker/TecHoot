#!/usr/bin/env python3
"""
Import întrebări din CSV (exportat din Excel) -> generează SQL pentru Supabase.

Template: templates/questions_import_template.csv

Rulare:
  python3 scripts/import_questions_from_csv.py path/to/questions.csv > src/db/migrations/008_import_from_csv.sql

CSV columns:
  - quiz_title (sau quiz_id dacă preferi; vezi mai jos)
  - prompt
  - option_a..option_d (2–4 opțiuni; cele goale sunt ignorate)
  - correct: a/b/c/d sau 0/1/2/3
  - order_index (opțional; default: indexul rândului)
  - time_limit_seconds (opțional; default: 30)

Notă:
  Scriptul generează un quiz per titlu (dacă nu există) și inserează întrebările.
"""

from __future__ import annotations

import csv
import json
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def sql_json_array(opts: list[str]) -> str:
    return "'" + json.dumps(opts, ensure_ascii=False).replace("'", "''") + "'::jsonb"


def parse_correct(v: str, option_count: int) -> int:
    raw = (v or "").strip().lower()
    if raw in {"a", "b", "c", "d"}:
        idx = {"a": 0, "b": 1, "c": 2, "d": 3}[raw]
    else:
        try:
            idx = int(raw)
        except Exception:
            raise ValueError(f"correct invalid: {v!r}")
    if idx < 0 or idx >= option_count:
        raise ValueError(f"correct out of range: {v!r} (options={option_count})")
    return idx


@dataclass
class Row:
    quiz_title: str
    prompt: str
    options: list[str]
    correct_index: int
    order_index: int
    time_limit_seconds: int


def read_rows(path: Path) -> list[Row]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        missing = {"quiz_title", "prompt", "option_a", "option_b", "correct"} - set(
            (reader.fieldnames or [])
        )
        if missing:
            raise SystemExit(
                f"CSV missing columns: {sorted(missing)}. Use templates/questions_import_template.csv."
            )
        out: list[Row] = []
        for i, d in enumerate(reader):
            quiz_title = (d.get("quiz_title") or "").strip()
            prompt = (d.get("prompt") or "").strip()
            opts = [
                (d.get("option_a") or "").strip(),
                (d.get("option_b") or "").strip(),
                (d.get("option_c") or "").strip(),
                (d.get("option_d") or "").strip(),
            ]
            options = [o for o in opts if o]
            if not quiz_title or not prompt:
                continue
            if len(options) < 2 or len(options) > 4:
                raise SystemExit(
                    f"Row {i+2}: options must be 2–4 (got {len(options)})."
                )
            correct = parse_correct(d.get("correct") or "", len(options))

            oi_raw = (d.get("order_index") or "").strip()
            order_index = int(oi_raw) if oi_raw else i

            tl_raw = (d.get("time_limit_seconds") or "").strip()
            time_limit_seconds = int(tl_raw) if tl_raw else 30
            if time_limit_seconds <= 0:
                time_limit_seconds = 30

            out.append(
                Row(
                    quiz_title=quiz_title,
                    prompt=prompt,
                    options=options,
                    correct_index=correct,
                    order_index=order_index,
                    time_limit_seconds=time_limit_seconds,
                )
            )
        return out


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: import_questions_from_csv.py <questions.csv>")
    path = Path(sys.argv[1])
    rows = read_rows(path)
    if not rows:
        raise SystemExit("No rows found.")

    by_quiz: dict[str, list[Row]] = defaultdict(list)
    for r in rows:
        by_quiz[r.quiz_title].append(r)

    print(
        "-- Import din CSV (generat automat). Rulează în Supabase SQL Editor.\n"
        "-- ATENȚIE: acest SQL nu face merge inteligent; inserează întrebările dacă quiz-ul nu are încă întrebări.\n"
    )

    for quiz_title, qrows in by_quiz.items():
        print(
            "INSERT INTO public.quizzes (title)\n"
            f"SELECT {sql_str(quiz_title)}\n"
            "WHERE NOT EXISTS (\n"
            "  SELECT 1 FROM public.quizzes WHERE title = "
            f"{sql_str(quiz_title)}\n"
            ");\n"
        )
        print(
            "WITH target AS (\n"
            "  SELECT id FROM public.quizzes WHERE title = "
            f"{sql_str(quiz_title)} ORDER BY created_at ASC LIMIT 1\n"
            "),\n"
            "ins AS (\n"
        )
        parts: list[str] = []
        for r in sorted(qrows, key=lambda x: x.order_index):
            parts.append(
                "  SELECT target.id, "
                f"{sql_str(r.prompt)}, {sql_json_array(r.options)}, "
                f"{r.correct_index}::smallint, {r.order_index}, {r.time_limit_seconds} "
                "FROM target"
            )
        print("  " + "\n  UNION ALL\n  ".join(parts))
        print(
            "\n)\n"
            "INSERT INTO public.questions (\n"
            "  quiz_id, prompt, options, correct_option_index, order_index, time_limit_seconds\n"
            ")\n"
            "SELECT * FROM ins\n"
            "WHERE NOT EXISTS (\n"
            "  SELECT 1 FROM public.questions q WHERE q.quiz_id = (SELECT id FROM target)\n"
            ");\n"
        )


if __name__ == "__main__":
    main()

