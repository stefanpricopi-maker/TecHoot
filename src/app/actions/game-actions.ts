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

export type AdvanceQuestionResult =
  | { ok: true; finished: boolean }
  | { ok: false; error: string };

export type ShowRoundResultsResult =
  | { ok: true }
  | { ok: false; error: string };

export type SubmitAnswerResult =
  | { ok: true }
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
      current_question_started_at: now,
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
      current_question_index: idx + 1,
      // Timer will be started explicitly by host after intermission.
      current_question_started_at: null,
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
): Promise<{ ok: true } | { ok: false; error: string }> {
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
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  // Idempotent: if already started, treat as ok.
  if (!updated) {
    return { ok: true };
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

  const { error: insErr } = await supabase.from("round_responses").insert({
    session_id: sessionId,
    player_id: playerId,
    question_index: qIdx,
    selected_option_index: answerIndex,
    points_earned: points,
  });

  if (insErr) {
    if (isUniqueViolation(insErr)) {
      return { ok: true };
    }
    return { ok: false, error: insErr.message };
  }

  if (points > 0) {
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
