-- Întrebări demo pentru quiz-ul creat automat cu titlul „Joc nou” (sau orice quiz cu acest titlu, cel mai vechi).
-- Rulează în SQL Editor după ce ai deja un rând în `quizzes`. Idempotent: nu inserează dacă acel quiz are deja întrebări.

WITH target AS (
  SELECT id
  FROM public.quizzes
  WHERE title = 'Joc nou'
  ORDER BY created_at ASC
  LIMIT 1
),
demo AS (
  SELECT *
  FROM (
    VALUES
      (
        'Care este capitala Franței?',
        '["Lyon", "Marseille", "Paris", "Nice"]'::jsonb,
        2::smallint,
        0,
        20
      ),
      (
        'Câte planete are sistemul solar (model clasic, fără Pluton)?',
        '["7", "8", "9", "10"]'::jsonb,
        1::smallint,
        1,
        25
      ),
      (
        'Ce înseamnă HTML?',
        '["Hyper Tool Markup Language", "Hyper Text Markup Language", "High Transfer Meta List", "Home Text Modern Link"]'::jsonb,
        1::smallint,
        2,
        30
      )
  ) AS t(prompt, options, correct_option_index, order_index, time_limit_seconds)
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
  target.id,
  demo.prompt,
  demo.options,
  demo.correct_option_index,
  demo.order_index,
  demo.time_limit_seconds
FROM target
CROSS JOIN demo
WHERE NOT EXISTS (
  SELECT 1
  FROM public.questions q
  WHERE q.quiz_id = target.id
);
