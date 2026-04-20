/** Valori stocate în coloana `sessions.status`. */
export type SessionStatus =
  | "lobby"
  | "question_active"
  | "showing_results"
  | "finished";

/** Rând `quizzes`. */
export interface Quiz {
  id: string;
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/** Rând `questions`: `options` este tabloul de string-uri (2–4 elemente). */
export interface Question {
  id: string;
  quiz_id: string;
  prompt: string;
  options: string[];
  /** single | true_false | multi_select (default single). */
  question_type?: "single" | "true_false" | "multi_select";
  correct_option_index: number;
  /** For multi_select only: array of correct indices. */
  correct_option_indices?: number[] | null;
  order_index: number;
  time_limit_seconds: number | null;
  created_at: string;
}

/** Rând `sessions`; `pin` este codul unic scurt pentru alăturare. */
export interface GameSession {
  id: string;
  quiz_id: string;
  pin: string;
  status: SessionStatus;
  current_question_id: string | null;
  current_question_index: number;
  /** Dacă e setat, jocul se oprește după N întrebări din quiz (în ordinea `order_index`). */
  question_count?: number | null;
  /** Seed pentru amestecarea deterministă a întrebărilor (same order pe toate device-urile). */
  question_seed?: number | null;
  /** Dacă e false, întrebările rămân în ordinea din DB (order_index). */
  randomize_questions?: boolean | null;
  team_mode?: boolean | null;
  current_question_started_at?: string | null;
  started_at: string | null;
  ended_at: string | null;
  /** Set by Admin when final leaderboard is published to players. */
  results_published_at?: string | null;
  expires_at: string | null;
  created_at: string;
}

/** Rând `players`: participant într-o sesiune, cu scor acumulat. */
export interface Player {
  id: string;
  session_id: string;
  display_name: string;
  avatar_key?: string | null;
  score: number;
  team_id?: string | null;
  joined_at: string;
  /** Ultimul ping din lobby (client); folosit pentru a ascunde tab-uri închise. */
  last_seen_at?: string | null;
}

/** Pachet util pentru UI: sesiune + întrebarea curentă (după join). */
export interface SessionWithCurrentQuestion extends GameSession {
  current_question: Question | null;
}
