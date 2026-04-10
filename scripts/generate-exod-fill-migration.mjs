#!/usr/bin/env node
/**
 * Regenerează src/db/migrations/017_exod_fill_missing_questions_from_json.sql
 * din src/data/questions/exod.json (inserare idempotentă după prompt).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const jsonPath = path.join(root, "src/data/questions/exod.json");
const outPath = path.join(
  root,
  "src/db/migrations/017_exod_fill_missing_questions_from_json.sql",
);

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
if (!Array.isArray(data)) {
  throw new Error("exod.json trebuie să fie un array de întrebări.");
}

function escSqlStr(s) {
  return String(s).replace(/'/g, "''");
}

function optionsJsonbLiteral(opts) {
  return JSON.stringify(opts).replace(/\\/g, "\\\\").replace(/'/g, "''");
}

const valueRows = data.map((q, i) => {
  const prompt = escSqlStr(q.question);
  const opts = optionsJsonbLiteral(q.options);
  const c = Number(q.correct);
  return `  ('${prompt}', '${opts}'::jsonb, ${c}::smallint, ${i})`;
});

const sql = `-- Idempotent: adaugă întrebări din src/data/questions/exod.json care nu există deja (după textul promptului).
-- Regenerare: node scripts/generate-exod-fill-migration.mjs
-- Folosește quiz-ul „Întrebări Exod”. Dacă lipsește quiz-ul, îl creează.

INSERT INTO public.quizzes (title, description)
SELECT 'Întrebări Exod', 'Import din src/data/questions/exod.json'
WHERE NOT EXISTS (
  SELECT 1 FROM public.quizzes WHERE title = 'Întrebări Exod'
);

WITH target AS (
  SELECT id FROM public.quizzes WHERE title = 'Întrebări Exod' ORDER BY created_at ASC LIMIT 1
),
raw AS (
  SELECT * FROM (VALUES
${valueRows.join(",\n")}
  ) AS v(prompt, options, correct_option_index, src_order)
),
candidates AS (
  SELECT r.prompt, r.options, r.correct_option_index, r.src_order
  FROM raw r
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.questions q
    WHERE q.quiz_id = (SELECT id FROM target)
      AND q.prompt = r.prompt
  )
),
mx AS (
  SELECT COALESCE(MAX(q.order_index), -1) AS m
  FROM public.questions q
  WHERE q.quiz_id = (SELECT id FROM target)
)
INSERT INTO public.questions (
  quiz_id,
  prompt,
  options,
  correct_option_index,
  order_index,
  time_limit_seconds
)
SELECT
  (SELECT id FROM target),
  c.prompt,
  c.options,
  c.correct_option_index,
  (SELECT m FROM mx) + ROW_NUMBER() OVER (ORDER BY c.src_order)::int,
  30
FROM candidates c;
`;

fs.writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${path.relative(root, outPath)} (${data.length} întrebări în sursă).`);
