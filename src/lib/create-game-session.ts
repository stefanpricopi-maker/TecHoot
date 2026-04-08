import { randomInt } from "node:crypto";

import type { GameSession } from "@/types/game";

import { createSupabaseServerClient } from "./supabase-server";

/** PIN numeri de 6 cifre (inclusiv prefixuri `0…`), unic în `sessions.pin` (spec: cod scurt de sesiune). */
const PIN_LENGTH = 6;
const PIN_SPACE = 1_000_000;
const MAX_PIN_ATTEMPTS = 25;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreateGameSessionResult =
  | { ok: true; session: GameSession }
  | { ok: false; error: string };

function randomSixDigitPin(): string {
  return String(randomInt(0, PIN_SPACE)).padStart(PIN_LENGTH, "0");
}

function isUniqueViolation(err: { code?: string; message?: string }): boolean {
  return err.code === "23505" || err.message?.includes("duplicate key") === true;
}

/**
 * Creează o sesiune în `lobby` pentru quiz-ul dat, cu PIN de 6 cifre unic.
 */
export async function createGameSession(
  quizId: string,
): Promise<CreateGameSessionResult> {
  const trimmedQuizId = quizId.trim();
  if (!UUID_RE.test(trimmedQuizId)) {
    return { ok: false, error: "ID-ul quiz-ului nu este valid." };
  }

  const supabase = createSupabaseServerClient();

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id")
    .eq("id", trimmedQuizId)
    .maybeSingle();

  if (quizError) {
    return { ok: false, error: quizError.message };
  }
  if (!quiz) {
    return { ok: false, error: "Quiz-ul nu există." };
  }

  for (let attempt = 0; attempt < MAX_PIN_ATTEMPTS; attempt++) {
    const pin = randomSixDigitPin();

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        quiz_id: trimmedQuizId,
        pin,
        status: "lobby",
      })
      .select(
        "id, quiz_id, pin, status, current_question_id, current_question_index, started_at, ended_at, expires_at, created_at",
      )
      .single();

    if (!error && data) {
      return { ok: true, session: data as GameSession };
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
