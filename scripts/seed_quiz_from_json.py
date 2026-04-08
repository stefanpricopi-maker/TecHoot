#!/usr/bin/env python3
"""
Seed quiz questions from a JSON file into the current Supabase schema.

Current schema.sql uses:
  - public.quizzes(title, description, ...)
  - public.questions(quiz_id, prompt, options::jsonb, correct_option_index, order_index, time_limit_seconds)

Input JSON format (as in src/data/questions/exod.json):
[
  { "question": "...", "options": ["a","b","c","d"], "correct": 2 },
  ...
]

Usage:
  python3 scripts/seed_quiz_from_json.py \
    --title "Întrebări Exod" \
    --description "Import din src/data/questions/exod.json" \
    --json src/data/questions/exod.json \
    > src/db/migrations/010_seed_exod_from_json.sql

Notes:
  - Generates INSERTs in batches of 20.
  - Idempotent per-quiz: only inserts questions if that quiz has 0 questions.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def sql_json_array(arr: list[str]) -> str:
    return "'" + json.dumps(arr, ensure_ascii=False).replace("'", "''") + "'::jsonb"


def chunked(xs: list[object], n: int) -> list[list[object]]:
    return [xs[i : i + n] for i in range(0, len(xs), n)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", required=True)
    ap.add_argument("--description", default=None)
    ap.add_argument("--json", required=True, dest="json_path")
    ap.add_argument("--time-limit", type=int, default=30)
    ap.add_argument("--batch", type=int, default=20)
    args = ap.parse_args()

    items = json.loads(Path(args.json_path).read_text(encoding="utf-8"))
    if not isinstance(items, list):
        raise SystemExit("JSON must be a list.")

    normalized: list[dict] = []
    for i, it in enumerate(items):
        if not isinstance(it, dict):
            continue
        q = str(it.get("question", "")).strip()
        opts = it.get("options")
        corr = it.get("correct")
        if not q or not isinstance(opts, list):
            continue
        options = [str(o).strip() for o in opts if str(o).strip()]
        if len(options) < 2 or len(options) > 4:
            raise SystemExit(f"Row {i}: options must be 2–4 (got {len(options)})")
        if not isinstance(corr, int) or corr < 0 or corr >= len(options):
            raise SystemExit(f"Row {i}: correct index invalid: {corr!r}")
        normalized.append(
            {
                "prompt": q,
                "options": options,
                "correct": corr,
                "order_index": i,
                "time_limit_seconds": args.time_limit,
            }
        )

    if not normalized:
        raise SystemExit("No questions parsed.")

    title = args.title.strip()
    desc = (args.description or "").strip() or None

    print("-- Seed generated from JSON.")
    print("-- Schema target: public.quizzes + public.questions (options jsonb + correct_option_index).")
    print(f"-- Source: {args.json_path}")
    print(f"-- Total questions: {len(normalized)}")
    print("")

    # Ensure quiz exists
    if desc is None:
        print("INSERT INTO public.quizzes (title)")
        print(f"SELECT {sql_str(title)}")
    else:
        print("INSERT INTO public.quizzes (title, description)")
        print(f"SELECT {sql_str(title)}, {sql_str(desc)}")
    print("WHERE NOT EXISTS (")
    print("  SELECT 1 FROM public.quizzes WHERE title = " + sql_str(title))
    print(");")
    print("")

    for batch_i, batch in enumerate(chunked(normalized, args.batch)):
        print(f"-- Batch {batch_i + 1}")
        print("INSERT INTO public.questions (quiz_id, prompt, options, correct_option_index, order_index, time_limit_seconds)")
        print("WITH target AS (")
        print("  SELECT id FROM public.quizzes WHERE title = " + sql_str(title) + " ORDER BY created_at ASC LIMIT 1")
        print("), existing AS (")
        print("  SELECT count(*)::int AS n FROM public.questions WHERE quiz_id = (SELECT id FROM target)")
        print(")")
        print("SELECT")
        print("  (SELECT id FROM target) AS quiz_id,")
        print("  v.prompt,")
        print("  v.options,")
        print("  v.correct_option_index,")
        print("  v.order_index,")
        print("  v.time_limit_seconds")
        values_lines = []
        # We'll use VALUES tuples and project them into columns.
        for q in batch:
            values_lines.append(
                "("
                + sql_str(q["prompt"])
                + ", "
                + sql_json_array(q["options"])
                + ", "
                + str(int(q["correct"]))
                + "::smallint, "
                + str(int(q["order_index"]))
                + ", "
                + str(int(q["time_limit_seconds"]))
                + ")"
            )
        print("FROM (VALUES")
        print("  " + ",\n  ".join(values_lines))
        print(") AS v(prompt, options, correct_option_index, order_index, time_limit_seconds)")
        print("WHERE (SELECT n FROM existing) = 0;")
        print("")

if __name__ == "__main__":
    main()
