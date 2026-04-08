import type { SupabaseClient } from "@supabase/supabase-js";

import type { QuizQuestionData } from "@/data/quiz-data";

export type PublicQuizQuestionData = Omit<QuizQuestionData, "correctAnswerIndex">;

export type QuestionRow = {
  id: string;
  prompt: string;
  options: unknown;
  correct_option_index: number;
  time_limit_seconds: number | null;
  order_index: number;
};

export type PublicQuestionRow = {
  id: string;
  prompt: string;
  options: unknown;
  time_limit_seconds: number | null;
  order_index: number;
};

export function mapQuestionRowToClient(row: QuestionRow): QuizQuestionData | null {
  if (!Array.isArray(row.options)) {
    return null;
  }
  const opts = row.options.filter((x): x is string => typeof x === "string");
  if (opts.length < 2 || opts.length > 4) {
    return null;
  }
  if (
    row.correct_option_index < 0 ||
    row.correct_option_index >= opts.length
  ) {
    return null;
  }
  return {
    id: row.id,
    text: row.prompt,
    options: opts,
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
  if (opts.length < 2 || opts.length > 4) {
    return null;
  }
  return {
    id: row.id,
    text: row.prompt,
    options: opts,
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
      "id, prompt, options, correct_option_index, time_limit_seconds, order_index",
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
    .select("id, prompt, options, time_limit_seconds, order_index")
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
