-- Quiz „Întrebări Geneza” — întrebări cu variante din cartea Geneza.
-- Sursa dorită de utilizator: https://ebiblia.ro/app/#qz/1 (quiz „Verifică-ți cunoștințele”) —
-- datele nu sunt disponibile ca fișier/API public; conținutul de mai jos urmează întrebări tipice
-- din narativul Genezii (cf. resurse educaționale cu variante multiple).
-- Idempotent: nu duplică dacă există deja un quiz cu acest titlu care are întrebări.

INSERT INTO public.quizzes (title, description)
SELECT
  'Întrebări Geneza',
  'Întrebări din cartea Geneza, cu variante (stil quiz biblic).'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.quizzes
  WHERE title = 'Întrebări Geneza'
);

WITH target AS (
  SELECT id
  FROM public.quizzes
  WHERE title = 'Întrebări Geneza'
  ORDER BY created_at ASC
  LIMIT 1
),
rows AS (
  SELECT *
  FROM (
    VALUES
      -- 1
      (
        'Cum a numit Dumnezeu lumina? (Geneza 1:5)',
        '["Viața", "Adevărul", "Ziua", "Scriptura"]'::jsonb,
        2::smallint,
        0,
        25
      ),
      -- 2
      (
        'Ce va mânca șarpele, după blestem? (Geneza 3:14)',
        '["Fructe uscate", "Iarba verde", "Insectele", "Țărână"]'::jsonb,
        3::smallint,
        1,
        25
      ),
      -- 3
      (
        'Cum se numește în Geneză „mama celor vii”? (Geneza 3:20)',
        '["Maria", "Rahela", "Eva", "Bat-Șeba"]'::jsonb,
        2::smallint,
        2,
        20
      ),
      -- 4
      (
        'În ce țară a locuit Cain după ce a ieșit din fața Domnului? (Geneza 4:16)',
        '["Nir", "Nebo", "Ur", "Nod"]'::jsonb,
        3::smallint,
        3,
        25
      ),
      -- 5
      (
        'În ce zi a venit potopul după ce a intrat Noe în corabie? (Geneza 7:7–10)',
        '["A 7-a", "A 8-a", "A 10-a", "A 40-a"]'::jsonb,
        1::smallint,
        4,
        25
      ),
      -- 6
      (
        'Ce frunze au cusut Adam și Eva pentru șorțuri? (Geneza 3:7)',
        '["De măslin", "De dafin", "De migdal", "De smochin"]'::jsonb,
        3::smallint,
        5,
        20
      ),
      -- 7
      (
        'Cu câți coți s-au înălțat apele deasupra munților la potop? (Geneza 7:20)',
        '["10 coți", "15 coți", "25 coți", "150 coți"]'::jsonb,
        1::smallint,
        6,
        25
      ),
      -- 8
      (
        'Ce pasăre a trimis Noe prima dată din corabie? (Geneza 8:7)',
        '["Vulturul", "Porumbelul", "Vrabia", "Corbul"]'::jsonb,
        3::smallint,
        7,
        25
      ),
      -- 9
      (
        'De câte ori a mai trimis Noe porumbelul din corabie? (Geneza 8:8–12)',
        '["O dată", "De două ori", "De trei ori", "De patru ori"]'::jsonb,
        2::smallint,
        8,
        30
      ),
      -- 10
      (
        'De câte ori l-a înșelat Iacov pe Esau (nașterea întâiului născut / binecuvântarea)? (Geneza 27:36)',
        '["O dată", "De două ori", "De trei ori", "Niciodată"]'::jsonb,
        1::smallint,
        9,
        35
      ),
      -- 11
      (
        'Câți copii a născut Lea lui Iacov? (Geneza 29–30)',
        '["Șase", "Șapte", "Opt", "Nouă"]'::jsonb,
        1::smallint,
        10,
        30
      ),
      -- 12
      (
        'Câți fii a avut Iacov (cei care dau numele celor douăsprezece seminții)? (Geneza 35:22–26)',
        '["Doisprezece", "Treisprezece", "Paisprezece", "Cincisprezece"]'::jsonb,
        0::smallint,
        11,
        35
      ),
      -- 13
      (
        'Cu câți sicli de argint l-au vândut frații pe Iosif ismaeliților? (Geneza 37:28)',
        '["Douăzeci", "Treizeci", "O sută", "O sută cincizeci"]'::jsonb,
        0::smallint,
        12,
        25
      ),
      -- 14
      (
        'Câți ani avea Iosif când a visat cocenii și au devenit frații invidioși? (Geneza 37:2)',
        '["Doisprezece", "Paisprezece", "Cincisprezece", "Șaptesprezece"]'::jsonb,
        3::smallint,
        13,
        25
      ),
      -- 15
      (
        'Ce a creat Dumnezeu în ziua a patra? (Geneza 1:14–19)',
        '["Tărâmul uscat", "Plantele", "Luminătorii (soarele, luna, stelele)", "Animalele marine"]'::jsonb,
        2::smallint,
        14,
        30
      ),
      -- 16
      (
        'Care era numele celui de-al doilea râu care ieșea din Eden? (Geneza 2:13)',
        '["Ghihon", "Pișon", "Tigrul", "Eufratul"]'::jsonb,
        0::smallint,
        15,
        30
      ),
      -- 17
      (
        'Unde a pus Dumnezeu heruvimii care păzeau drumul spre pomul vieții? (Geneza 3:24)',
        '["Spre miazăzi", "Spre miazănoapte", "Spre apus", "Spre răsărit"]'::jsonb,
        3::smallint,
        16,
        25
      ),
      -- 18
      (
        'Câți ani avea Noe când a venit potopul? (Geneza 7:6)',
        '["Patru sute", "Șase sute", "Șapte sute", "Cinci sute cincizeci"]'::jsonb,
        1::smallint,
        17,
        25
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
  rows.prompt,
  rows.options,
  rows.correct_option_index,
  rows.order_index,
  rows.time_limit_seconds
FROM target
CROSS JOIN rows
WHERE NOT EXISTS (
  SELECT 1
  FROM public.questions q
  WHERE q.quiz_id = target.id
);
