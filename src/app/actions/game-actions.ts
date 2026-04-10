"use server";

import { cookies } from "next/headers";

import { generatePin, normalizeJoinPin } from "@/lib/game-logic";
import { fetchOrderedQuizQuestions } from "@/lib/quiz-db";
import { hashStringToSeed, seededShuffle } from "@/lib/seeded-shuffle";
import {
  ADMIN_SESSION_KEY_COOKIE,
  PLAYER_COOKIE_MAX_AGE,
  PLAYER_ID_COOKIE,
  PLAYER_NICKNAME_COOKIE,
  PLAYER_SESSION_PIN_COOKIE,
} from "@/lib/player-storage";
import { createSupabaseAdminClient, createSupabaseClient } from "@/lib/supabase";

export type CreateSessionResult =
  | { ok: true; pin: string; sessionId: string }
  | { ok: false; error: string };

export type StartGameResult =
  | { ok: true }
  | { ok: false; error: string };

export type JoinSessionResult =
  | { ok: true; playerId: string; pin: string; nickname: string }
  | { ok: false; error: string };

export type ResumeSessionRouteResult =
  | { ok: true; route: string }
  | { ok: false; error: string };

export type PingLobbyPresenceResult =
  | { ok: true }
  | { ok: false; error: string };

export type AdvanceQuestionResult =
  | { ok: true; finished: boolean }
  | { ok: false; error: string };

export type ShowRoundResultsResult =
  | { ok: true }
  | { ok: false; error: string };

export type SubmitAnswerResult =
  | { ok: true }
  | { ok: false; error: string };

export type HardestQuestionAdminResult =
  | {
      ok: true;
      hardest: {
        questionIndex: number;
        prompt: string;
        correct: number;
        wrong: number;
        answered: number;
        correctPct: number;
      } | null;
    }
  | { ok: false; error: string };

export type ListQuizzesResult =
  | { ok: true; quizzes: { id: string; title: string | null }[] }
  | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

async function countQuestionsForQuiz(
  supabase: ReturnType<typeof createSupabaseClient>,
  quizId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("quiz_id", quizId);
  if (error) {
    return 0;
  }
  return count ?? 0;
}

async function countQuestionsForSession(
  supabase: ReturnType<typeof createSupabaseClient>,
  sessionId: string,
): Promise<number> {
  const { data: session, error } = await supabase
    .from("sessions")
    .select("quiz_id, question_count")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !session?.quiz_id) {
    return 0;
  }
  const total = await countQuestionsForQuiz(supabase, session.quiz_id as string);
  const limit = session.question_count as number | null | undefined;
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    return Math.min(total, Math.floor(limit));
  }
  return total;
}

async function fetchSessionQuestions(
  supabase: ReturnType<typeof createSupabaseClient>,
  sessionId: string,
): Promise<{ questions: Awaited<ReturnType<typeof fetchOrderedQuizQuestions>>; limit: number; seed: number }> {
  const { data: sess, error } = await supabase
    .from("sessions")
    .select("id, quiz_id, question_count, question_seed, pin")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !sess?.quiz_id) {
    return { questions: [], limit: 0, seed: 1 };
  }

  const ordered = await fetchOrderedQuizQuestions(
    supabase,
    sess.quiz_id as string,
  );
  const total = ordered.length;
  const rawLimit = sess.question_count as number | null | undefined;
  const limit =
    typeof rawLimit === "number" && Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(total, Math.floor(rawLimit))
      : total;

  const seedVal = sess.question_seed as number | null | undefined;
  const seed =
    typeof seedVal === "number" && Number.isFinite(seedVal) && seedVal > 0
      ? Math.floor(seedVal)
      : hashStringToSeed(String(sess.pin ?? sessionId));

  return { questions: ordered, limit, seed };
}

export async function listQuizzes(): Promise<ListQuizzesResult> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("id, title")
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    quizzes: (data ?? []) as { id: string; title: string | null }[],
  };
}

const ADMIN_QUESTIONS_PAGE_SIZE = 50;

export type AdminQuestionRowDto = {
  id: string;
  quiz_id: string;
  prompt: string;
  options: string[];
  correct_option_index: number;
  order_index: number;
  time_limit_seconds: number | null;
};

export type ListQuizQuestionsAdminPageResult =
  | {
      ok: true;
      questions: AdminQuestionRowDto[];
      total: number;
      page: number;
      pageSize: number;
    }
  | { ok: false; error: string };

/** Paginare întrebări pentru ecranul Admin (service role). */
export async function listQuizQuestionsAdminPage(
  quizIdRaw: string,
  page: number,
): Promise<ListQuizQuestionsAdminPageResult> {
  const quizId = quizIdRaw.trim();
  if (!isUuid(quizId)) {
    return { ok: false, error: "ID quiz invalid." };
  }
  const supabase = createSupabaseAdminClient();
  const { count, error: cErr } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("quiz_id", quizId);
  if (cErr) {
    return { ok: false, error: cErr.message };
  }
  const total = count ?? 0;
  const pageSize = ADMIN_QUESTIONS_PAGE_SIZE;
  const safePage = Math.max(1, Math.floor(Number.isFinite(page) ? page : 1));
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, quiz_id, prompt, options, correct_option_index, order_index, time_limit_seconds",
    )
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    return { ok: false, error: error.message };
  }

  const questions: AdminQuestionRowDto[] = (data ?? []).map((row) => {
    const raw = row.options as unknown;
    const options = Array.isArray(raw)
      ? (raw as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    return {
      id: row.id as string,
      quiz_id: row.quiz_id as string,
      prompt: String(row.prompt ?? ""),
      options,
      correct_option_index: Number(row.correct_option_index ?? 0),
      order_index: Number(row.order_index ?? 0),
      time_limit_seconds:
        row.time_limit_seconds == null
          ? null
          : Number(row.time_limit_seconds),
    };
  });

  return { ok: true, questions, total, page: safePage, pageSize };
}

export async function updateQuizQuestionAdmin(input: {
  questionId: string /** UUID */;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  timeLimitSeconds: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isUuid(input.questionId)) {
    return { ok: false, error: "ID întrebare invalid." };
  }
  const prompt = input.prompt.trim();
  if (!prompt) {
    return { ok: false, error: "Textul întrebării nu poate fi gol." };
  }
  const opts = input.options.map((o) => String(o).trim()).filter(Boolean);
  if (opts.length < 2 || opts.length > 4) {
    return { ok: false, error: "Sunt necesare între 2 și 4 variante de răspuns." };
  }
  if (
    input.correctOptionIndex < 0 ||
    input.correctOptionIndex >= opts.length
  ) {
    return { ok: false, error: "Răspunsul corect trebuie să fie o variantă validă." };
  }
  if (input.timeLimitSeconds != null) {
    const t = Number(input.timeLimitSeconds);
    if (!Number.isFinite(t) || t <= 0) {
      return { ok: false, error: "Limita de timp trebuie să fie un număr positiv sau goală." };
    }
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("questions")
    .update({
      prompt,
      options: opts,
      correct_option_index: input.correctOptionIndex,
      time_limit_seconds:
        input.timeLimitSeconds == null
          ? null
          : Math.floor(Number(input.timeLimitSeconds)),
    })
    .eq("id", input.questionId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteQuizQuestionAdmin(
  questionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = questionId.trim();
  if (!isUuid(id)) {
    return { ok: false, error: "ID întrebare invalid." };
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type ImportQuizQuestionItemInput = {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
};

export type ImportQuizQuestionsBatchAdminResult =
  | {
      ok: true;
      imported: number;
      skippedDuplicates: number;
      errors: { rowIndex: number; message: string }[];
    }
  | { ok: false; error: string };

function normalizeImportQuestionItem(
  raw: ImportQuizQuestionItemInput,
):
  | { ok: true; prompt: string; options: string[]; correctOptionIndex: number }
  | { ok: false; message: string } {
  const prompt = String(raw.prompt ?? "").trim();
  if (!prompt) {
    return { ok: false, message: "Textul întrebării lipsește sau e gol." };
  }
  const opts = (raw.options ?? []).map((o) => String(o).trim()).filter(Boolean);
  if (opts.length < 2 || opts.length > 4) {
    return {
      ok: false,
      message: "Sunt necesare între 2 și 4 variante de răspuns (ne-goale).",
    };
  }
  const idx = Number(raw.correctOptionIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx >= opts.length) {
    return { ok: false, message: "Indexul răspunsului corect nu e valid." };
  }
  return { ok: true, prompt, options: opts, correctOptionIndex: Math.floor(idx) };
}

/**
 * Inserare batch întrebări (Admin UI / import). Service role.
 * Rândurile invalide sunt raportate în `errors`; cele valide se inserează.
 */
export async function importQuizQuestionsBatchAdmin(input: {
  quizId: string;
  items: ImportQuizQuestionItemInput[];
  defaultTimeLimitSeconds?: number | null;
  skipDuplicates?: boolean;
}): Promise<ImportQuizQuestionsBatchAdminResult> {
  const quizId = input.quizId.trim();
  if (!isUuid(quizId)) {
    return { ok: false, error: "ID quiz invalid." };
  }
  const items = input.items ?? [];
  if (items.length === 0) {
    return { ok: false, error: "Nu ai trimis nici o întrebare." };
  }
  if (items.length > 500) {
    return { ok: false, error: "Maxim 500 întrebări per import." };
  }

  const defaultT =
    input.defaultTimeLimitSeconds == null
      ? 30
      : Math.floor(Number(input.defaultTimeLimitSeconds));
  if (!Number.isFinite(defaultT) || defaultT <= 0) {
    return { ok: false, error: "Limita de timp implicită trebuie să fie > 0." };
  }

  const supabase = createSupabaseAdminClient();

  const { data: quizRow, error: qErr } = await supabase
    .from("quizzes")
    .select("id")
    .eq("id", quizId)
    .maybeSingle();
  if (qErr) {
    return { ok: false, error: qErr.message };
  }
  if (!quizRow?.id) {
    return { ok: false, error: "Quiz-ul nu există." };
  }

  const { data: maxRow, error: mErr } = await supabase
    .from("questions")
    .select("order_index")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (mErr) {
    return { ok: false, error: mErr.message };
  }
  let nextOrder =
    maxRow?.order_index == null
      ? 0
      : Math.floor(Number(maxRow.order_index)) + 1;

  const existingPrompts = new Set<string>();
  if (input.skipDuplicates) {
    const { data: promptsData, error: pErr } = await supabase
      .from("questions")
      .select("prompt")
      .eq("quiz_id", quizId);
    if (pErr) {
      return { ok: false, error: pErr.message };
    }
    for (const r of promptsData ?? []) {
      existingPrompts.add(String((r as { prompt?: string }).prompt ?? "").trim());
    }
  }

  const errors: { rowIndex: number; message: string }[] = [];
  let skippedDuplicates = 0;
  const rows: {
    quiz_id: string;
    prompt: string;
    options: string[];
    correct_option_index: number;
    order_index: number;
    time_limit_seconds: number;
  }[] = [];

  for (let i = 0; i < items.length; i++) {
    const norm = normalizeImportQuestionItem(items[i]!);
    if (!norm.ok) {
      errors.push({ rowIndex: i, message: norm.message });
      continue;
    }
    if (
      input.skipDuplicates &&
      existingPrompts.has(norm.prompt)
    ) {
      skippedDuplicates += 1;
      continue;
    }
    if (input.skipDuplicates) {
      existingPrompts.add(norm.prompt);
    }
    rows.push({
      quiz_id: quizId,
      prompt: norm.prompt,
      options: norm.options,
      correct_option_index: norm.correctOptionIndex,
      order_index: nextOrder,
      time_limit_seconds: defaultT,
    });
    nextOrder += 1;
  }

  if (rows.length === 0) {
    return {
      ok: true,
      imported: 0,
      skippedDuplicates,
      errors,
    };
  }

  const { error: insErr } = await supabase.from("questions").insert(rows);
  if (insErr) {
    return { ok: false, error: insErr.message };
  }

  return {
    ok: true,
    imported: rows.length,
    skippedDuplicates,
    errors,
  };
}

// --- Admin: întreținere, quiz-uri, sesiuni ---------------------------------

export type AdminMaintenanceStatsResult =
  | {
      ok: true;
      quizCount: number;
      questionCount: number;
      sessionCount: number;
      activeSessionCount: number;
      serviceRoleConfigured: boolean;
      adminToolsSecretConfigured: boolean;
    }
  | { ok: false; error: string };

export async function getAdminMaintenanceStats(): Promise<AdminMaintenanceStatsResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const [{ count: qc }, { count: pq }, { count: sc }, { count: ac }] =
      await Promise.all([
        supabase.from("quizzes").select("*", { count: "exact", head: true }),
        supabase.from("questions").select("*", { count: "exact", head: true }),
        supabase.from("sessions").select("*", { count: "exact", head: true }),
        supabase
          .from("sessions")
          .select("*", { count: "exact", head: true })
          .neq("status", "finished"),
      ]);
    return {
      ok: true,
      quizCount: qc ?? 0,
      questionCount: pq ?? 0,
      sessionCount: sc ?? 0,
      activeSessionCount: ac ?? 0,
      serviceRoleConfigured: Boolean(
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      ),
      adminToolsSecretConfigured: Boolean(
        process.env.ADMIN_TOOLS_SECRET?.trim(),
      ),
    };
  } catch (e) {
    const msg =
      e instanceof Error && e.message ? e.message : "Eroare la statistici.";
    return { ok: false, error: msg };
  }
}

export type RunAdminCleanupResult =
  | { ok: true; deletedSessions: number }
  | { ok: false; error: string };

/** Apelează `public.cleanup_old_data` (service role). `olderThanDays` default 2. */
export async function runAdminCleanupOldData(
  olderThanDays: number = 2,
): Promise<RunAdminCleanupResult> {
  const d = Math.floor(Number(olderThanDays));
  if (!Number.isFinite(d) || d < 1 || d > 365) {
    return { ok: false, error: "Interval invalid (1–365 zile)." };
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("cleanup_old_data", {
      p_older_than: `${d} days`,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    const row = Array.isArray(data) ? data[0] : data;
    const n = Number((row as { deleted_sessions?: number })?.deleted_sessions ?? 0);
    return { ok: true, deletedSessions: Number.isFinite(n) ? n : 0 };
  } catch (e) {
    const msg =
      e instanceof Error && e.message ? e.message : "Eroare la cleanup.";
    return { ok: false, error: msg };
  }
}

export async function createQuizAdmin(input: {
  title: string;
  description?: string | null;
}): Promise<{ ok: true; quizId: string } | { ok: false; error: string }> {
  const title = String(input.title ?? "").trim();
  if (title.length < 1 || title.length > 200) {
    return { ok: false, error: "Titlul trebuie să aibă 1–200 caractere." };
  }
  const desc =
    input.description == null
      ? null
      : String(input.description).trim().slice(0, 2000) || null;
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("quizzes")
      .insert({ title, description: desc })
      .select("id")
      .single();
    if (error || !data?.id) {
      return { ok: false, error: error?.message ?? "Nu s-a putut crea quiz-ul." };
    }
    return { ok: true, quizId: data.id as string };
  } catch (e) {
    const msg =
      e instanceof Error && e.message ? e.message : "Eroare la creare quiz.";
    return { ok: false, error: msg };
  }
}

export async function updateQuizMetaAdmin(input: {
  quizId: string;
  title: string;
  description?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const quizId = input.quizId.trim();
  if (!isUuid(quizId)) {
    return { ok: false, error: "ID quiz invalid." };
  }
  const title = String(input.title ?? "").trim();
  if (title.length < 1 || title.length > 200) {
    return { ok: false, error: "Titlul trebuie să aibă 1–200 caractere." };
  }
  const desc =
    input.description === undefined
      ? undefined
      : input.description == null
        ? null
        : String(input.description).trim().slice(0, 2000) || null;
  try {
    const supabase = createSupabaseAdminClient();
    const patch: Record<string, unknown> = {
      title,
      updated_at: new Date().toISOString(),
    };
    if (desc !== undefined) {
      patch.description = desc;
    }
    const { error } = await supabase.from("quizzes").update(patch).eq("id", quizId);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof Error && e.message ? e.message : "Eroare la actualizare.";
    return { ok: false, error: msg };
  }
}

export async function deleteQuizAdmin(
  quizIdRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const quizId = quizIdRaw.trim();
  if (!isUuid(quizId)) {
    return { ok: false, error: "ID quiz invalid." };
  }
  try {
    const supabase = createSupabaseAdminClient();
    // `sessions.quiz_id` → ON DELETE RESTRICT blochează ștergerea quiz-ului dacă există sesiuni.
    // Ștergem mai întâi sesiunile (players / round_responses dispar prin ON DELETE CASCADE pe session).
    const { error: sessionsErr } = await supabase
      .from("sessions")
      .delete()
      .eq("quiz_id", quizId);
    if (sessionsErr) {
      return { ok: false, error: sessionsErr.message };
    }
    const { data: deletedRows, error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", quizId)
      .select("id");
    if (error) {
      return { ok: false, error: error.message };
    }
    if (!deletedRows?.length) {
      return {
        ok: false,
        error:
          "Nu s-a șters niciun quiz (ID inexistent sau lipsă permisiuni). Verifică Supabase și cheia service role.",
      };
    }
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof Error && e.message ? e.message : "Eroare la ștergere quiz.";
    return { ok: false, error: msg };
  }
}

export type ExportQuizJsonResult =
  | { ok: true; json: string; fileBase: string }
  | { ok: false; error: string };

/** Export în forma exod.json: [{ question, options, correct }]. */
export async function exportQuizQuestionsJsonAdmin(
  quizIdRaw: string,
): Promise<ExportQuizJsonResult> {
  const quizId = quizIdRaw.trim();
  if (!isUuid(quizId)) {
    return { ok: false, error: "ID quiz invalid." };
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { data: quiz, error: qe } = await supabase
      .from("quizzes")
      .select("title")
      .eq("id", quizId)
      .maybeSingle();
    if (qe) {
      return { ok: false, error: qe.message };
    }
    if (!quiz) {
      return { ok: false, error: "Quiz inexistent." };
    }
    const { data: rows, error } = await supabase
      .from("questions")
      .select("prompt, options, correct_option_index")
      .eq("quiz_id", quizId)
      .order("order_index", { ascending: true })
      .order("id", { ascending: true });
    if (error) {
      return { ok: false, error: error.message };
    }
    const payload = (rows ?? []).map((r) => {
      const raw = r.options as unknown;
      const options = Array.isArray(raw)
        ? (raw as unknown[]).filter((x): x is string => typeof x === "string")
        : [];
      return {
        question: String(r.prompt ?? ""),
        options,
        correct: Number(r.correct_option_index ?? 0),
      };
    });
    const title = String((quiz as { title?: string }).title ?? "quiz")
      .replace(/[^\w\d\-]+/g, "_")
      .slice(0, 40);
    return {
      ok: true,
      json: `${JSON.stringify(payload, null, 2)}\n`,
      fileBase: title || "quiz",
    };
  } catch (e) {
    const msg =
      e instanceof Error && e.message ? e.message : "Eroare la export.";
    return { ok: false, error: msg };
  }
}

export async function addQuizQuestionAdmin(input: {
  quizId: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  timeLimitSeconds?: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const norm = normalizeImportQuestionItem({
    prompt: input.prompt,
    options: input.options,
    correctOptionIndex: input.correctOptionIndex,
  });
  if (!norm.ok) {
    return { ok: false, error: norm.message };
  }
  const quizId = input.quizId.trim();
  if (!isUuid(quizId)) {
    return { ok: false, error: "ID quiz invalid." };
  }
  let timeLimit = 30;
  if (input.timeLimitSeconds != null) {
    const t = Math.floor(Number(input.timeLimitSeconds));
    if (!Number.isFinite(t) || t <= 0) {
      return { ok: false, error: "Limită timp invalidă." };
    }
    timeLimit = t;
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { data: qrow, error: qe } = await supabase
      .from("quizzes")
      .select("id")
      .eq("id", quizId)
      .maybeSingle();
    if (qe || !qrow) {
      return { ok: false, error: qe?.message ?? "Quiz inexistent." };
    }
    const { data: maxRow, error: me } = await supabase
      .from("questions")
      .select("order_index")
      .eq("quiz_id", quizId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (me) {
      return { ok: false, error: me.message };
    }
    const nextOrder =
      maxRow?.order_index == null
        ? 0
        : Math.floor(Number(maxRow.order_index)) + 1;
    const { error: ie } = await supabase.from("questions").insert({
      quiz_id: quizId,
      prompt: norm.prompt,
      options: norm.options,
      correct_option_index: norm.correctOptionIndex,
      order_index: nextOrder,
      time_limit_seconds: timeLimit,
    });
    if (ie) {
      return { ok: false, error: ie.message };
    }
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof Error && e.message ? e.message : "Eroare la adăugare.";
    return { ok: false, error: msg };
  }
}

export type AdminSessionRowDto = {
  id: string;
  pin: string;
  status: string;
  quiz_id: string;
  quiz_title: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

export type ListSessionsAdminPageResult =
  | {
      ok: true;
      sessions: AdminSessionRowDto[];
      total: number;
      page: number;
      pageSize: number;
    }
  | { ok: false; error: string };

const ADMIN_SESSIONS_PAGE_SIZE = 25;

export async function listSessionsAdminPage(
  page: number,
): Promise<ListSessionsAdminPageResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const safePage = Math.max(1, Math.floor(Number.isFinite(page) ? page : 1));
    const pageSize = ADMIN_SESSIONS_PAGE_SIZE;
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { count, error: cErr } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true });
    if (cErr) {
      return { ok: false, error: cErr.message };
    }
    const total = count ?? 0;

    const { data, error } = await supabase
      .from("sessions")
      .select("id, pin, status, quiz_id, created_at, started_at, ended_at")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return { ok: false, error: error.message };
    }

    const rows = data ?? [];
    const quizIds = [...new Set(rows.map((r: { quiz_id?: string }) => String(r.quiz_id ?? "")).filter(Boolean))];
    const titleByQuiz = new Map<string, string | null>();
    if (quizIds.length > 0) {
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, title")
        .in("id", quizIds);
      for (const q of quizzes ?? []) {
        titleByQuiz.set(String((q as { id?: string }).id), (q as { title?: string | null }).title ?? null);
      }
    }

    const sessions: AdminSessionRowDto[] = rows.map((row: Record<string, unknown>) => {
      const qid = String(row.quiz_id ?? "");
      return {
        id: row.id as string,
        pin: String(row.pin ?? ""),
        status: String(row.status ?? ""),
        quiz_id: qid,
        quiz_title: titleByQuiz.get(qid) ?? null,
        created_at: String(row.created_at ?? ""),
        started_at: row.started_at == null ? null : String(row.started_at),
        ended_at: row.ended_at == null ? null : String(row.ended_at),
      };
    });

    return { ok: true, sessions, total, page: safePage, pageSize };
  } catch (e) {
    const msg =
      e instanceof Error && e.message ? e.message : "Eroare la listare sesiuni.";
    return { ok: false, error: msg };
  }
}

export async function forceFinishSessionAdmin(
  sessionIdRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sessionId = sessionIdRaw.trim();
  if (!isUuid(sessionId)) {
    return { ok: false, error: "ID sesiune invalid." };
  }
  try {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("sessions")
      .update({
        status: "finished",
        ended_at: now,
      })
      .eq("id", sessionId);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof Error && e.message ? e.message : "Eroare la închidere sesiune.";
    return { ok: false, error: msg };
  }
}

const MAX_PIN_ATTEMPTS = 25;
const BASE_SCORE_CORRECT = 1000;
const MAX_SPEED_BONUS = 500;

function computeRoundPoints(
  correct: boolean,
  answeredAt: Date,
  roundStartedAt: Date | null,
  timeLimitSeconds: number,
): number {
  if (!correct) {
    return 0;
  }
  if (!roundStartedAt || timeLimitSeconds <= 0) {
    return BASE_SCORE_CORRECT;
  }
  const limitMs = timeLimitSeconds * 1000;
  const elapsed = Math.max(0, answeredAt.getTime() - roundStartedAt.getTime());
  const ratio = Math.min(1, elapsed / limitMs);
  const bonus = Math.floor(MAX_SPEED_BONUS * (1 - ratio));
  return BASE_SCORE_CORRECT + bonus;
}

function isUniqueViolation(err: { code?: string; message?: string }): boolean {
  return err.code === "23505" || err.message?.includes("duplicate key") === true;
}

async function requireAdminForSession(sessionId: string): Promise<
  | { ok: true; adminKey: string; sessionId: string }
  | { ok: false; error: string }
> {
  const cookieStore = await cookies();
  const key = cookieStore.get(ADMIN_SESSION_KEY_COOKIE)?.value;
  if (!key) {
    return { ok: false, error: "Neautorizat (lipsă cheie Admin)." };
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, admin_key")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data?.id) {
    return { ok: false, error: "Sesiunea nu există." };
  }
  if (String((data as any).admin_key) !== key) {
    return { ok: false, error: "Neautorizat (cheie Admin invalidă)." };
  }
  return { ok: true, adminKey: key, sessionId };
}

export async function createSession(
  quizIdRaw: string,
  questionCountRaw?: number | null,
  randomizeQuestionsRaw?: boolean,
): Promise<CreateSessionResult> {
  const quizId = quizIdRaw.trim();
  if (!isUuid(quizId)) {
    return { ok: false, error: "ID quiz invalid (trebuie să fie UUID)." };
  }

  const supabase = createSupabaseAdminClient();

  const { data: quizRow, error: quizErr } = await supabase
    .from("quizzes")
    .select("id")
    .eq("id", quizId)
    .maybeSingle();

  if (quizErr) {
    return { ok: false, error: quizErr.message };
  }
  if (!quizRow) {
    return {
      ok: false,
      error: "Nu există un quiz cu acest ID în baza de date.",
    };
  }

  const totalQuestions = await countQuestionsForQuiz(supabase, quizId);
  if (totalQuestions < 1) {
    return {
      ok: false,
      error:
        "Quiz-ul ales nu are întrebări în baza de date. Adaugă rânduri în `questions` pentru acest quiz.",
    };
  }

  const qc =
    typeof questionCountRaw === "number" && Number.isFinite(questionCountRaw)
      ? Math.floor(questionCountRaw)
      : null;
  if (qc != null && (qc < 1 || qc > totalQuestions)) {
    return {
      ok: false,
      error: `Număr întrebări invalid. Alege între 1 și ${totalQuestions}.`,
    };
  }

  const randomizeQuestions =
    typeof randomizeQuestionsRaw === "boolean" ? randomizeQuestionsRaw : true;
  const sessionSeed = Math.floor(Math.random() * 2_147_483_647) + 1;

  for (let attempt = 0; attempt < MAX_PIN_ATTEMPTS; attempt++) {
    const pin = generatePin();

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        quiz_id: quizId,
        question_count: qc,
        question_seed: sessionSeed,
        randomize_questions: randomizeQuestions,
        pin,
        status: "lobby",
      })
      .select("id, pin, admin_key")
      .single();

    if (!error && data?.pin && data?.id) {
      const cookieStore = await cookies();
      const secure = process.env.NODE_ENV === "production";
      const adminKey = String((data as any).admin_key ?? "");
      if (adminKey) {
        cookieStore.set(ADMIN_SESSION_KEY_COOKIE, adminKey, {
          httpOnly: true,
          secure,
          sameSite: "lax",
          path: "/",
          maxAge: PLAYER_COOKIE_MAX_AGE,
        });
      }
      return {
        ok: true,
        pin: data.pin as string,
        sessionId: data.id as string,
      };
    }

    if (error && isUniqueViolation(error)) {
      continue;
    }

    return {
      ok: false,
      error: error?.message ?? "Nu s-a putut crea sesiunea.",
    };
  }

  return {
    ok: false,
    error:
      "Nu s-a reușit generarea unui PIN unic după mai multe încercări. Încearcă din nou.",
  };
}

type SessionRow = {
  id: string;
  status: string;
  ended_at: string | null;
  expires_at: string | null;
};

function isSessionJoinable(row: SessionRow): boolean {
  if (row.status === "finished") {
    return false;
  }
  if (row.ended_at) {
    return false;
  }
  if (row.expires_at && new Date(row.expires_at) <= new Date()) {
    return false;
  }
  return true;
}

const NICKNAME_MIN = 1;
const NICKNAME_MAX = 32;

export async function joinSession(
  pinRaw: string,
  nicknameRaw: string,
): Promise<JoinSessionResult> {
  const pin = normalizeJoinPin(pinRaw);
  if (!pin) {
    return {
      ok: false,
      error: "PIN invalid. Introdu 4–6 cifre (ex. codul afișat de gazdă).",
    };
  }

  const nickname = nicknameRaw.trim();
  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return {
      ok: false,
      error: `Porecla trebuie să aibă între ${NICKNAME_MIN} și ${NICKNAME_MAX} caractere.`,
    };
  }

  const supabase = createSupabaseAdminClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, status, ended_at, expires_at")
    .eq("pin", pin)
    .maybeSingle();

  if (sessionError) {
    return { ok: false, error: sessionError.message };
  }
  if (!session) {
    return { ok: false, error: "Nu există o sesiune cu acest PIN." };
  }
  if (!isSessionJoinable(session as SessionRow)) {
    return {
      ok: false,
      error: "Sesiunea nu mai acceptă jucători (s-a încheiat sau a expirat).",
    };
  }

  const sessionId = session.id as string;

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      session_id: sessionId,
      display_name: nickname,
    })
    .select("id")
    .single();

  if (playerError || !player?.id) {
    return {
      ok: false,
      error: playerError?.message ?? "Nu te-am putut adăuga la sesiune.",
    };
  }

  const playerId = player.id as string;
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set(PLAYER_ID_COOKIE, playerId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: PLAYER_COOKIE_MAX_AGE,
  });

  cookieStore.set(PLAYER_NICKNAME_COOKIE, nickname, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: PLAYER_COOKIE_MAX_AGE,
  });

  cookieStore.set(PLAYER_SESSION_PIN_COOKIE, pin, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: PLAYER_COOKIE_MAX_AGE,
  });

  return { ok: true, playerId, pin, nickname };
}

export async function resolveResumeRoute(input: {
  pin: string;
  playerId: string;
  nickname: string;
}): Promise<ResumeSessionRouteResult> {
  const pin = normalizeJoinPin(input.pin);
  const playerId = String(input.playerId ?? "").trim();
  const nickname = String(input.nickname ?? "").trim();

  if (!pin) {
    return { ok: false, error: "PIN invalid." };
  }
  if (!isUuid(playerId)) {
    return { ok: false, error: "Player invalid." };
  }
  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return { ok: false, error: "Nickname invalid." };
  }

  // Use service role to avoid RLS-related false negatives, but require both
  // playerId and nickname to match to prevent easy hijacking.
  const supabase = createSupabaseAdminClient();

  const { data: sess, error: sessErr } = await supabase
    .from("sessions")
    .select("id, status, ended_at, expires_at, pin")
    .eq("pin", pin)
    .maybeSingle();

  if (sessErr) return { ok: false, error: sessErr.message };
  if (!sess?.id) return { ok: false, error: "Nu există o sesiune cu acest PIN." };

  const sessionId = sess.id as string;

  const { data: playerRow, error: pErr } = await supabase
    .from("players")
    .select("id, session_id, display_name")
    .eq("id", playerId)
    .maybeSingle();

  if (pErr) return { ok: false, error: pErr.message };
  if (!playerRow?.id) return { ok: false, error: "Nu te-am găsit în sesiune." };
  if (String(playerRow.session_id) !== sessionId) {
    return { ok: false, error: "Nu te-am găsit în sesiunea acestui PIN." };
  }
  if (String(playerRow.display_name ?? "") !== nickname) {
    return { ok: false, error: "Nickname diferit (nu putem reconecta automat)." };
  }

  const status = String((sess as any).status ?? "");
  if (status === "lobby") {
    return { ok: true, route: `/lobby/${encodeURIComponent(pin)}` };
  }
  if (status === "finished") {
    return { ok: true, route: `/game/results/${encodeURIComponent(pin)}` };
  }
  // question_active / showing_results
  return { ok: true, route: `/game/player/${encodeURIComponent(pin)}` };
}

/** Heartbeat lobby: actualizează `last_seen_at` (cookie jucător + PIN sesiune). */
export async function pingLobbyPresence(): Promise<PingLobbyPresenceResult> {
  try {
    const cookieStore = await cookies();
    const playerId = cookieStore.get(PLAYER_ID_COOKIE)?.value?.trim() ?? "";
    if (!isUuid(playerId)) {
      return { ok: false, error: "Nu ești autentificat ca jucător." };
    }
    const pin = normalizeJoinPin(
      cookieStore.get(PLAYER_SESSION_PIN_COOKIE)?.value ?? "",
    );
    if (!pin) {
      return { ok: false, error: "PIN lipsă." };
    }

    const supabase = createSupabaseAdminClient();

    const { data: sess, error: sessErr } = await supabase
      .from("sessions")
      .select("id, status")
      .eq("pin", pin)
      .maybeSingle();

    if (sessErr) return { ok: false, error: sessErr.message };
    if (!sess?.id) return { ok: false, error: "Sesiune inexistentă." };

    if (String(sess.status) !== "lobby") {
      return { ok: true };
    }

    const sessionId = sess.id as string;

    const { data: playerRow, error: pErr } = await supabase
      .from("players")
      .select("id, session_id")
      .eq("id", playerId)
      .maybeSingle();

    if (pErr) return { ok: false, error: pErr.message };
    if (!playerRow?.id || String(playerRow.session_id) !== sessionId) {
      return { ok: false, error: "Player invalid pentru această sesiune." };
    }

    const { error: upErr } = await supabase
      .from("players")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", playerId);

    if (upErr) return { ok: false, error: upErr.message };
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof Error && e.message ? e.message : "Eroare la ping lobby.";
    return { ok: false, error: msg };
  }
}

/**
 * START: `lobby` → `question_active`, `current_question_index` = 0.
 * În DB statusul nu este literal „question”, ci **`question_active`** (enum).
 */
export async function startGame(sessionId: string): Promise<StartGameResult> {
  const auth = await requireAdminForSession(sessionId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = createSupabaseAdminClient();

  const { data: existing, error: readError } = await supabase
    .from("sessions")
    .select("id, status, quiz_id, question_count")
    .eq("id", sessionId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }
  if (!existing) {
    return { ok: false, error: "Sesiunea nu există." };
  }
  if (existing.status !== "lobby") {
    return {
      ok: false,
      error: "Jocul a fost deja pornit sau sesiunea nu mai este în lobby.",
    };
  }

  const quizIdRow = existing.quiz_id as string | undefined;
  if (!quizIdRow) {
    return { ok: false, error: "Sesiune fără quiz." };
  }

  const total = await countQuestionsForQuiz(supabase, quizIdRow);
  if (total < 1) {
    return {
      ok: false,
      error:
        "Quiz-ul ales nu are întrebări în baza de date. Adaugă rânduri în `questions` pentru acest quiz.",
    };
  }
  const limit = existing.question_count as number | null | undefined;
  if (typeof limit === "number" && Number.isFinite(limit)) {
    const qc = Math.floor(limit);
    if (qc < 1 || qc > total) {
      return {
        ok: false,
        error: `Sesiunea are un număr de întrebări invalid (${qc}). Alege între 1 și ${total}.`,
      };
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("sessions")
    .update({
      status: "question_active",
      started_at: now,
      current_question_index: 0,
      // Timer will be started explicitly by host after intermission.
      current_question_started_at: null,
    })
    .eq("id", sessionId)
    .eq("status", "lobby")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return { ok: false, error: updateError.message };
  }
  if (!updated) {
    return {
      ok: false,
      error:
        "Nu s-a putut porni jocul (sesiunea a fost modificată sau nu mai e în lobby).",
    };
  }

  return { ok: true };
}

/** Compatibilitate cu codul care folosea `startSession`. */
export async function startSession(
  sessionId: string,
): Promise<StartGameResult> {
  return startGame(sessionId);
}

/** După întrebare: afișează rezultatele (`question_active` → `showing_results`). */
export async function showRoundResults(
  sessionId: string,
): Promise<ShowRoundResultsResult> {
  const auth = await requireAdminForSession(sessionId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = createSupabaseAdminClient();

  // Make this action idempotent in case the host double-clicks or Realtime lags:
  // - if already in `showing_results`, treat as success
  // - otherwise transition from `question_active`
  const { data: sess, error: readErr } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (readErr) {
    return { ok: false, error: readErr.message };
  }
  if (!sess) {
    return { ok: false, error: "Sesiunea nu există." };
  }
  const currentStatus = sess.status as string;
  if (currentStatus === "showing_results") {
    return { ok: true };
  }
  if (currentStatus !== "question_active") {
    return {
      ok: false,
      error: "Nu s-au putut afișa rezultatele (stare invalidă).",
    };
  }

  const { data: updated, error } = await supabase
    .from("sessions")
    .update({ status: "showing_results" })
    .eq("id", sessionId)
    .eq("status", "question_active")
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!updated) {
    // Race condition: someone else may have transitioned it.
    const { data: sessAfter } = await supabase
      .from("sessions")
      .select("status")
      .eq("id", sessionId)
      .maybeSingle();
    if ((sessAfter?.status as string | undefined) === "showing_results") {
      return { ok: true };
    }
    return { ok: false, error: "Nu s-au putut afișa rezultatele." };
  }
  return { ok: true };
}

/** Admin remote: sare peste întrebarea curentă (forțează rezultatele). */
export async function skipCurrentQuestion(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireAdminForSession(sessionId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = createSupabaseAdminClient();

  const { data: sess, error: readErr } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!sess?.id) return { ok: false, error: "Sesiunea nu există." };

  const st = String((sess as any).status ?? "");
  if (st === "showing_results") return { ok: true };
  if (st !== "question_active") {
    return { ok: false, error: "Poți da Skip doar în timpul întrebării." };
  }

  const { error: upErr } = await supabase
    .from("sessions")
    .update({ status: "showing_results" })
    .eq("id", sessionId)
    .eq("status", "question_active");
  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true };
}

export async function getHardestQuestionAdmin(
  sessionId: string,
): Promise<HardestQuestionAdminResult> {
  const auth = await requireAdminForSession(sessionId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = createSupabaseAdminClient();

  const { data: sess, error: sErr } = await supabase
    .from("sessions")
    .select("id, quiz_id, pin, question_count, question_seed, randomize_questions")
    .eq("id", sessionId)
    .maybeSingle();
  if (sErr) return { ok: false, error: sErr.message };
  if (!sess?.quiz_id) return { ok: false, error: "Sesiune fără quiz." };

  const { questions: ordered, limit, seed } = await fetchSessionQuestions(
    supabase,
    sessionId,
  );
  const randomize = (sess.randomize_questions as boolean | null | undefined) ?? true;
  const shuffled = randomize ? seededShuffle(ordered, seed) : ordered;
  const effectiveLen = Math.min(limit, shuffled.length);

  const { data: rows, error: rErr } = await supabase
    .from("round_responses")
    .select("question_index, selected_option_index")
    .eq("session_id", sessionId);
  if (rErr) return { ok: false, error: rErr.message };

  const totals = new Map<number, { answered: number; correct: number }>();
  for (const r of rows ?? []) {
    const qIdx = Number((r as any).question_index ?? -1);
    const sel = Number((r as any).selected_option_index ?? -1);
    if (!Number.isFinite(qIdx) || qIdx < 0 || qIdx >= effectiveLen) continue;
    const q = shuffled[qIdx];
    if (!q) continue;
    const correctIdx = Number((q as any).correct_option_index ?? -1);
    const entry = totals.get(qIdx) ?? { answered: 0, correct: 0 };
    entry.answered += 1;
    if (sel === correctIdx) entry.correct += 1;
    totals.set(qIdx, entry);
  }

  let hardest: Extract<
    HardestQuestionAdminResult,
    { ok: true }
  >["hardest"] = null;
  for (const [qIdx, stat] of totals.entries()) {
    if (stat.answered <= 0) continue;
    const pct = Math.round((stat.correct / stat.answered) * 100);
    const wrong = stat.answered - stat.correct;
    const q = shuffled[qIdx];
    const prompt = String((q as any)?.prompt ?? "");
    if (!prompt) continue;
    if (
      hardest == null ||
      pct < hardest.correctPct ||
      (pct === hardest.correctPct && wrong > hardest.wrong)
    ) {
      hardest = {
        questionIndex: qIdx,
        prompt,
        correct: stat.correct,
        wrong,
        answered: stat.answered,
        correctPct: pct,
      };
    }
  }

  return { ok: true, hardest };
}

/**
 * După rezultate: următoarea întrebare sau final.
 * `showing_results` → `question_active` (index+1) sau `finished`.
 */
export async function proceedAfterResults(
  sessionId: string,
): Promise<AdvanceQuestionResult> {
  const auth = await requireAdminForSession(sessionId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = createSupabaseAdminClient();
  const len = await countQuestionsForSession(supabase, sessionId);
  if (len === 0) {
    return { ok: false, error: "Nu există întrebări în quiz." };
  }

  const { data: session, error: readError } = await supabase
    .from("sessions")
    .select("id, status, current_question_index")
    .eq("id", sessionId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }
  if (!session) {
    return { ok: false, error: "Sesiunea nu există." };
  }
  if (session.status !== "showing_results") {
    return {
      ok: false,
      error: "Nu ești în faza de rezultate.",
    };
  }

  const idx = session.current_question_index as number;
  const nextIdx = idx + 1;

  if (idx >= len - 1) {
    const { error: finErr } = await supabase
      .from("sessions")
      .update({
        status: "finished",
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("status", "showing_results");

    if (finErr) {
      return { ok: false, error: finErr.message };
    }
    return { ok: true, finished: true };
  }

  const { error: upErr } = await supabase
    .from("sessions")
    .update({
      status: "question_active",
      current_question_index: nextIdx,
      // Timer will be started after countdown / break.
      current_question_started_at: null,
      leaderboard_break_until: null,
    })
    .eq("id", sessionId)
    .eq("status", "showing_results");

  if (upErr) {
    return { ok: false, error: upErr.message };
  }
  return { ok: true, finished: false };
}

/** Pornește timerul întrebării curente dacă nu a pornit deja. */
export async function startCurrentQuestionTimer(
  sessionId: string,
): Promise<{ ok: true; startedAt: string } | { ok: false; error: string }> {
  const auth = await requireAdminForSession(sessionId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("sessions")
    .update({ current_question_started_at: now })
    .eq("id", sessionId)
    .eq("status", "question_active")
    .is("current_question_started_at", null)
    .select("id, current_question_started_at")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  const started =
    (updated?.current_question_started_at as string | undefined) ?? null;
  if (started) {
    return { ok: true, startedAt: started };
  }

  const { data: sess } = await supabase
    .from("sessions")
    .select("status, current_question_started_at")
    .eq("id", sessionId)
    .maybeSingle();

  const existing = sess?.current_question_started_at as string | null;
  if (existing) {
    return { ok: true, startedAt: existing };
  }

  return {
    ok: false,
    error:
      "Cronometrul nu s-a pornit. Folosește același browser cu care ai creat sesiunea (cookie Admin), sau reîncarcă pagina gazdei.",
};
}

/** Oprește prematur sesiunea (gazdă): participanții trec la clasament / ecran final. */
export async function quitGameSession(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireAdminForSession(sessionId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: row } = await supabase
    .from("sessions")
    .select("status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Sesiunea nu există." };
  }
  if ((row.status as string) === "finished") {
    return { ok: true };
  }

  const { error } = await supabase
    .from("sessions")
    .update({ status: "finished", ended_at: now })
    .eq("id", sessionId)
    .in("status", ["lobby", "question_active", "showing_results"]);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function getHostCorrectOptionIndex(
  sessionId: string,
): Promise<{ ok: true; correctIndex: number } | { ok: false; error: string }> {
  const auth = await requireAdminForSession(sessionId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = createSupabaseAdminClient();

  const { data: sess, error: sErr } = await supabase
    .from("sessions")
    .select(
      "id, quiz_id, current_question_index, question_count, question_seed, randomize_questions, pin",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (sErr) return { ok: false, error: sErr.message };
  if (!sess?.quiz_id) return { ok: false, error: "Sesiune fără quiz." };

  const ordered = await fetchOrderedQuizQuestions(supabase, sess.quiz_id as string);
  const seedVal = sess.question_seed as number | null | undefined;
  const seed =
    typeof seedVal === "number" && Number.isFinite(seedVal) && seedVal > 0
      ? Math.floor(seedVal)
      : hashStringToSeed(String(sess.pin ?? sessionId));
  const randomize = (sess.randomize_questions as boolean | null) ?? true;
  const shuffled = randomize ? seededShuffle(ordered, seed) : ordered;

  const rawLimit = sess.question_count as number | null | undefined;
  const limit =
    typeof rawLimit === "number" && Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(shuffled.length, Math.floor(rawLimit))
      : shuffled.length;
  const effective = shuffled.slice(0, limit);

  const qIdx = sess.current_question_index as number;
  const q = effective[qIdx];
  if (!q) return { ok: false, error: "Întrebare invalidă." };
  return { ok: true, correctIndex: q.correctAnswerIndex };
}

/**
 * Înregistrează răspunsul: verificare față de întrebările quiz-ului sesiunii, scor + bonus viteză.
 */
export async function submitAnswer(
  pinRaw: string,
  playerId: string,
  questionId: string,
  answerIndex: number,
): Promise<SubmitAnswerResult> {
  const pin = normalizeJoinPin(pinRaw);
  if (!pin || answerIndex < 0) {
    return { ok: false, error: "Date invalide." };
  }

  const cookieStore = await cookies();
  const cookiePid = cookieStore.get(PLAYER_ID_COOKIE)?.value;
  if (!cookiePid || cookiePid !== playerId) {
    return { ok: false, error: "Neautorizat." };
  }

  const supabase = createSupabaseAdminClient();

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select(
      "id, status, current_question_index, current_question_started_at, quiz_id, question_count, question_seed, randomize_questions, pin",
    )
    .eq("pin", pin)
    .maybeSingle();

  if (sErr) {
    return { ok: false, error: sErr.message };
  }
  if (!session || session.status !== "question_active") {
    return { ok: false, error: "Nu poți răspunde acum." };
  }
  if (!session.current_question_started_at) {
    return { ok: false, error: "Întrebarea nu a început încă." };
  }

  const qIdx = session.current_question_index as number;
  const sessionId = session.id as string;

  const { data: playerRow } = await supabase
    .from("players")
    .select("session_id")
    .eq("id", playerId)
    .maybeSingle();

  if (!playerRow || (playerRow.session_id as string) !== sessionId) {
    return { ok: false, error: "Jucător invalid pentru această sesiune." };
  }

  const quizId = session.quiz_id as string | undefined;
  if (!quizId) {
    return { ok: false, error: "Sesiune fără quiz." };
  }

  const ordered = await fetchOrderedQuizQuestions(supabase, quizId);
  const seedVal = session.question_seed as number | null | undefined;
  const seed =
    typeof seedVal === "number" && Number.isFinite(seedVal) && seedVal > 0
      ? Math.floor(seedVal)
      : hashStringToSeed(String(session.pin ?? pin));
  const randomize = (session.randomize_questions as boolean | null) ?? true;
  const shuffled = randomize ? seededShuffle(ordered, seed) : ordered;

  const rawLimit = session.question_count as number | null | undefined;
  const limit =
    typeof rawLimit === "number" && Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(shuffled.length, Math.floor(rawLimit))
      : shuffled.length;

  const effective = shuffled.slice(0, limit);
  if (qIdx < 0 || qIdx >= effective.length) {
    return { ok: false, error: "Întrebare invalidă." };
  }

  const questionDef = effective[qIdx];
  if (!questionDef || questionDef.id !== questionId) {
    return { ok: false, error: "Întrebarea nu corespunde rundei curente." };
  }

  if (answerIndex >= questionDef.options.length) {
    return { ok: false, error: "Variantă invalidă." };
  }

  const correct = questionDef.correctAnswerIndex === answerIndex;
  const answeredAt = new Date();
  const roundStarted = session.current_question_started_at
    ? new Date(session.current_question_started_at as string)
    : null;
  const points = computeRoundPoints(
    correct,
    answeredAt,
    roundStarted,
    questionDef.timeLimit,
  );

  if (roundStarted) {
    const deadline = roundStarted.getTime() + questionDef.timeLimit * 1000;
    if (answeredAt.getTime() > deadline) {
      return { ok: false, error: "Timpul pentru această întrebare a expirat." };
    }
  }

  const { data: existingResp } = await supabase
    .from("round_responses")
    .select("id, selected_option_index, points_earned")
    .eq("player_id", playerId)
    .eq("question_index", qIdx)
    .maybeSingle();

  // First answer for this round → insert.
  if (!existingResp?.id) {
    const { error: insErr } = await supabase.from("round_responses").insert({
      session_id: sessionId,
      player_id: playerId,
      question_index: qIdx,
      selected_option_index: answerIndex,
      points_earned: points,
    });

    if (insErr) {
      if (isUniqueViolation(insErr)) {
        // Race: someone inserted between select+insert. Treat as update path.
      } else {
        return { ok: false, error: insErr.message };
      }
    } else {
      if (points !== 0) {
        const { data: pl } = await supabase
          .from("players")
          .select("score")
          .eq("id", playerId)
          .single();
        if (pl) {
          await supabase
            .from("players")
            .update({ score: (pl.score as number) + points })
            .eq("id", playerId);
        }
      }
      return { ok: true };
    }
  }

  // Change answer within the same round → update response + apply score delta.
  const existingId = (existingResp?.id as string | undefined) ?? null;
  if (!existingId) {
    // Extremely unlikely (race), but keep safe.
    return { ok: false, error: "Nu s-a putut actualiza răspunsul (lipsește ID)." };
  }
  const prevPoints = Number(existingResp?.points_earned ?? 0);
  const prevIdx = Number(existingResp?.selected_option_index ?? -1);
  if (prevIdx === answerIndex) {
    return { ok: true };
  }
  const delta = points - prevPoints;

  const { error: updErr } = await supabase
    .from("round_responses")
    .update({
      selected_option_index: answerIndex,
      points_earned: points,
    })
    .eq("id", existingId);

  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  if (delta !== 0) {
    const { data: pl } = await supabase
      .from("players")
      .select("score")
      .eq("id", playerId)
      .single();
    if (pl) {
      await supabase
        .from("players")
        .update({ score: (pl.score as number) + delta })
        .eq("id", playerId);
    }
  }

  return { ok: true };
}
