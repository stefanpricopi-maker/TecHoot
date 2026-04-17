import type { SupabaseClient } from "@supabase/supabase-js";

import type { QuestionType, QuizQuestionData } from "@/data/quiz-data";

export type PublicQuizQuestionData = {
  id: string;
  text: string;
  reference?: string | null;
  options: readonly string[];
  timeLimit: number;
  type: QuestionType;
};

export type QuestionRow = {
  id: string;
  prompt: string;
  reference?: unknown;
  options: unknown;
  question_type?: unknown;
  correct_option_index: number;
  correct_option_indices?: unknown;
  time_limit_seconds: number | null;
  order_index: number;
};

export type PublicQuestionRow = {
  id: string;
  prompt: string;
  reference?: unknown;
  options: unknown;
  question_type?: unknown;
  time_limit_seconds: number | null;
  order_index: number;
};

function normalizeQuestionType(raw: unknown): QuestionType {
  if (raw === "true_false") return "true_false";
  if (raw === "multi_select") return "multi_select";
  return "single";
}

function normalizeCorrectIndices(raw: unknown, optionLen: number): number[] | null {
  if (!Array.isArray(raw)) return null;
  const out: number[] = [];
  for (const v of raw) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const i = Math.floor(v);
    if (i < 0 || i >= optionLen) continue;
    if (!out.includes(i)) out.push(i);
  }
  return out.length ? out : null;
}

export function mapQuestionRowToClient(row: QuestionRow): QuizQuestionData | null {
  if (!Array.isArray(row.options)) {
    return null;
  }
  const opts = row.options.filter((x): x is string => typeof x === "string");
  const type = normalizeQuestionType(row.question_type);
  if (type === "true_false") {
    if (opts.length !== 2) return null;
  } else {
    if (opts.length < 2 || opts.length > 4) return null;
  }

  if (type === "multi_select") {
    const indices = normalizeCorrectIndices(row.correct_option_indices, opts.length);
    if (!indices) return null;
    return {
      id: row.id,
      text: row.prompt,
      reference: typeof row.reference === "string" ? row.reference : null,
      options: opts,
      type,
      correctAnswerIndices: indices,
      timeLimit: row.time_limit_seconds ?? 30,
    };
  }

  if (row.correct_option_index < 0 || row.correct_option_index >= opts.length) {
    return null;
  }
  return {
    id: row.id,
    text: row.prompt,
    reference: typeof row.reference === "string" ? row.reference : null,
    options: opts,
    type,
    correctAnswerIndex: row.correct_option_index,
    timeLimit: row.time_limit_seconds ?? 30,
  };
}

export function mapPublicQuestionRowToClient(
  row: PublicQuestionRow,
): PublicQuizQuestionData | null {
  if (!Array.isArray(row.options)) {
    return null;
  }
  const opts = row.options.filter((x): x is string => typeof x === "string");
  const type = normalizeQuestionType(row.question_type);
  if (type === "true_false") {
    if (opts.length !== 2) return null;
  } else {
    if (opts.length < 2 || opts.length > 4) return null;
  }
  return {
    id: row.id,
    text: row.prompt,
    reference: typeof row.reference === "string" ? row.reference : null,
    options: opts,
    type,
    timeLimit: row.time_limit_seconds ?? 30,
  };
}

export async function fetchOrderedQuizQuestions(
  supabase: SupabaseClient,
  quizId: string,
): Promise<QuizQuestionData[]> {
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, prompt, reference, options, question_type, correct_option_index, correct_option_indices, time_limit_seconds, order_index",
    )
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });

  if (error || !data) {
    return [];
  }
  const out: QuizQuestionData[] = [];
  for (const row of data) {
    const q = mapQuestionRowToClient(row as QuestionRow);
    if (q) {
      out.push(q);
    }
  }
  return out;
}

export async function fetchOrderedQuizQuestionsPublic(
  supabase: SupabaseClient,
  quizId: string,
): Promise<PublicQuizQuestionData[]> {
  const { data, error } = await supabase
    .from("questions_public")
    .select("id, prompt, reference, options, question_type, time_limit_seconds, order_index")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });

  if (error || !data) {
    return [];
  }
  const out: PublicQuizQuestionData[] = [];
  for (const row of data) {
    const q = mapPublicQuestionRowToClient(row as PublicQuestionRow);
    if (q) out.push(q);
  }
  return out;
}
