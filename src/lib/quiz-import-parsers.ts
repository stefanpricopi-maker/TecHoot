/** Aceeași formă ca `ImportQuizQuestionItemInput` din server actions. */
export type QuizImportItemDraft = {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
};

export function validateQuizImportItemDraft(
  item: QuizImportItemDraft,
): string | null {
  const prompt = item.prompt.trim();
  if (!prompt) return "Textul întrebării lipsește sau e gol.";
  const opts = item.options.map((o) => String(o).trim()).filter(Boolean);
  if (opts.length < 2 || opts.length > 4) {
    return "Sunt necesare între 2 și 4 variante (ne-goale).";
  }
  const idx = Number(item.correctOptionIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx >= opts.length) {
    return "Indexul răspunsului corect nu e valid.";
  }
  return null;
}

/** O linie CSV cu câmpuri între ghilimele opționale. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

export function parseCorrectCell(
  v: string,
  optionCount: number,
): { ok: true; index: number } | { ok: false; message: string } {
  const raw = (v ?? "").trim().toLowerCase();
  if (raw === "") {
    return { ok: false, message: "Celula „correct” e goală." };
  }
  let idx: number;
  if (raw === "a" || raw === "b" || raw === "c" || raw === "d") {
    idx = { a: 0, b: 1, c: 2, d: 3 }[raw]!;
  } else {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) {
      return { ok: false, message: `„correct” invalid: ${v}` };
    }
    idx = n;
  }
  if (idx < 0 || idx >= optionCount) {
    return {
      ok: false,
      message: `„correct” în afara intervalului (0–${optionCount - 1} sau a–d).`,
    };
  }
  return { ok: true, index: idx };
}

export type ParsedRowResult =
  | { ok: true; item: QuizImportItemDraft; rowIndex: number }
  | { ok: false; message: string; rowIndex: number };

const CSV_REQUIRED = new Set([
  "quiz_title",
  "prompt",
  "option_a",
  "option_b",
  "correct",
]);

/**
 * Parsează CSV ca în templates/questions_import_template.csv.
 * `quizTitleFilter`: dacă e setat, ignoră rândurile cu alt quiz_title.
 */
export function parseQuestionsCsv(
  text: string,
  quizTitleFilter?: string | null,
): { headerError: string | null; rows: ParsedRowResult[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { headerError: "CSV-ul trebuie să aibă antet + cel puțin un rând.", rows: [] };
  }
  const header = parseCsvLine(lines[0]!);
  const normHeader = header.map((h) => h.trim().toLowerCase());
  const col = (name: string) => normHeader.indexOf(name);
  const missing = [...CSV_REQUIRED].filter((n) => col(n) < 0);
  if (missing.length) {
    return {
      headerError: `Coloane lipsă: ${missing.join(", ")}. Vezi templates/questions_import_template.csv.`,
      rows: [],
    };
  }
  const ix = {
    quiz_title: col("quiz_title"),
    prompt: col("prompt"),
    option_a: col("option_a"),
    option_b: col("option_b"),
    option_c: col("option_c"),
    option_d: col("option_d"),
    correct: col("correct"),
  };

  const filterTitle = (quizTitleFilter ?? "").trim();
  const rows: ParsedRowResult[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r]!);
    const get = (i: number) => (i >= 0 && i < cells.length ? cells[i]! : "").trim();

    const qTitle = get(ix.quiz_title);
    if (filterTitle && qTitle !== filterTitle) {
      continue;
    }
    const prompt = get(ix.prompt);
    const opts = [
      get(ix.option_a),
      get(ix.option_b),
      ix.option_c >= 0 ? get(ix.option_c) : "",
      ix.option_d >= 0 ? get(ix.option_d) : "",
    ].filter(Boolean);

    if (!prompt && opts.length === 0) {
      continue;
    }

    if (!prompt) {
      rows.push({
        ok: false,
        rowIndex: r,
        message: "Prompt gol.",
      });
      continue;
    }

    const corr = parseCorrectCell(get(ix.correct), opts.length);
    if (!corr.ok) {
      rows.push({ ok: false, rowIndex: r, message: corr.message });
      continue;
    }

    rows.push({
      ok: true,
      rowIndex: r,
      item: {
        prompt,
        options: opts,
        correctOptionIndex: corr.index,
      },
    });
  }

  return { headerError: null, rows };
}

export type JsonParseExodResult =
  | { ok: true; items: QuizImportItemDraft[] }
  | { ok: false; message: string };

/** Array de obiecte ca în exod.json: question, options, correct */
export function parseJsonExodShape(raw: string): JsonParseExodResult {
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, message: "JSON invalid (parse error)." };
  }
  if (!Array.isArray(data)) {
    return { ok: false, message: "JSON-ul trebuie să fie un array de întrebări." };
  }
  const items: QuizImportItemDraft[] = [];
  for (let i = 0; i < data.length; i++) {
    const el = data[i];
    if (el === null || typeof el !== "object") {
      return { ok: false, message: `Elementul ${i} nu e obiect.` };
    }
    const o = el as Record<string, unknown>;
    const q = o.question ?? o.prompt;
    const prompt = typeof q === "string" ? q.trim() : "";
    const optionsRaw = o.options;
    if (!Array.isArray(optionsRaw)) {
      return { ok: false, message: `Elementul ${i}: „options” trebuie să fie array.` };
    }
    const options = optionsRaw
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
    const correct = o.correct ?? o.correctOptionIndex;
    const idx =
      typeof correct === "number"
        ? correct
        : typeof correct === "string"
          ? Number.parseInt(correct, 10)
          : NaN;
    items.push({
      prompt,
      options,
      correctOptionIndex: Number.isFinite(idx) ? idx : 0,
    });
  }
  return { ok: true, items };
}

/**
 * Blocuri separate prin linie care conține doar --- (opțional spații).
 * În fiecare bloc:
 * - prima linie nevidă = întrebare (opțional prefix „Întrebare:” / „Q:”)
 * - linii A) B) C) D) sau A. B. … (variante)
 * - linie Corect: B / Răspuns: 2 / *corect: c
 */
export function parseBlockFormatText(raw: string): {
  blocks: ParsedRowResult[];
  parseError: string | null;
} {
  const chunks = raw
    .split(/^\s*---\s*$/m)
    .map((c) => c.trim())
    .filter(Boolean);

  if (chunks.length === 0 && raw.trim()) {
    chunks.push(raw.trim());
  }

  const blocks: ParsedRowResult[] = [];
  let blockIndex = 0;

  for (const chunk of chunks) {
    const lines = chunk
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) continue;

    let question = "";
    const options: string[] = [];
    let correctIdx: number | null = null;

    const optRe = /^([A-Da-d])[\).]\s*(.+)$/;
    const correctRe =
      /^(?:\*?\s*)?(?:corect|răspuns|raspons|correct)\s*:\s*([A-Da-d0-3])\s*$/i;

    for (const line of lines) {
      const cr = line.match(correctRe);
      if (cr) {
        const ch = cr[1]!;
        if (/^[0-3]$/.test(ch)) {
          correctIdx = Number.parseInt(ch, 10);
        } else {
          const u = ch.toLowerCase();
          if (u >= "a" && u <= "d") {
            correctIdx = u.charCodeAt(0) - 97;
          } else {
            correctIdx = null;
          }
        }
        continue;
      }
      const om = line.match(optRe);
      if (om) {
        options.push(om[2]!.trim());
        continue;
      }
      if (!question) {
        question = line.replace(/^(?:întrebare|intrebare|q)\s*:\s*/i, "").trim();
      } else {
        question = `${question} ${line}`.trim();
      }
    }

    const rowIndex = blockIndex;
    blockIndex++;

    if (!question) {
      blocks.push({
        ok: false,
        rowIndex,
        message: "Lipsește textul întrebării.",
      });
      continue;
    }
    if (options.length < 2 || options.length > 4) {
      blocks.push({
        ok: false,
        rowIndex,
        message: `Ai nevoie de 2–4 variante (A)…D)); am găsit ${options.length}.`,
      });
      continue;
    }
    if (correctIdx == null || correctIdx < 0 || correctIdx >= options.length) {
      blocks.push({
        ok: false,
        rowIndex,
        message:
          "Lipsește sau e invalidă linia „Corect: A” (sau B/C/D sau 0–3).",
      });
      continue;
    }

    blocks.push({
      ok: true,
      rowIndex,
      item: {
        prompt: question,
        options,
        correctOptionIndex: correctIdx,
      },
    });
  }

  return { blocks, parseError: null };
}
