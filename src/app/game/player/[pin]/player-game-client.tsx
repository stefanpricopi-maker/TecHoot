"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { submitAnswer } from "@/app/actions/game-actions";
import type { PublicQuizQuestionData } from "@/lib/quiz-db";
import { fetchOrderedQuizQuestionsPublic } from "@/lib/quiz-db";
import { hashStringToSeed, seededShuffle } from "@/lib/seeded-shuffle";
import { LS_PLAYER_ID_KEY } from "@/lib/player-storage";
import { createSupabaseClient } from "@/lib/supabase";
import { useGameAudio } from "@/hooks/useGameAudio";
import type { GameSession } from "@/types/game";

export const KAHOOT_CELLS = [
  { shape: "1", label: "Opțiunea 1 (roșu)", className: "bg-red-500 text-white" },
  { shape: "2", label: "Opțiunea 2 (albastru)", className: "bg-blue-600 text-white" },
  { shape: "3", label: "Opțiunea 3 (galben)", className: "bg-amber-400 text-zinc-900" },
  { shape: "4", label: "Opțiunea 4 (verde)", className: "bg-green-600 text-white" },
] as const;

type PlayerGameClientProps = {
  normalizedPin: string;
};

export function PlayerGameClient({ normalizedPin }: PlayerGameClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<GameSession["status"]>("lobby");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [roundOutcome, setRoundOutcome] = useState<
    "loading" | "correct" | "wrong" | "none"
  >("loading");
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [questions, setQuestions] = useState<PublicQuizQuestionData[] | null>(null);
  const [sessionQuestionLimit, setSessionQuestionLimit] = useState<number | null>(
    null,
  );
  const [sessionSeed, setSessionSeed] = useState<number | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<string | null>(null);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [pickedOption, setPickedOption] = useState<number | null>(null);
  const [rankPos, setRankPos] = useState<number | null>(null);
  const [rankTotal, setRankTotal] = useState<number | null>(null);

  const audio = useGameAudio({
    role: "player",
    status,
    roundOutcome,
  });

  const shuffledQuestions = useMemo(() => {
    if (!questions) return null;
    if (!randomizeQuestions) return questions;
    const seed =
      sessionSeed != null && Number.isFinite(sessionSeed) && sessionSeed > 0
        ? Math.floor(sessionSeed)
        : hashStringToSeed(normalizedPin);
    return seededShuffle(questions, seed);
  }, [questions, sessionSeed, normalizedPin, randomizeQuestions]);

  const effectiveLen = useMemo(() => {
    const len = shuffledQuestions?.length ?? 0;
    if (sessionQuestionLimit == null) return len;
    if (!Number.isFinite(sessionQuestionLimit) || sessionQuestionLimit <= 0) {
      return len;
    }
    return Math.min(len, Math.floor(sessionQuestionLimit));
  }, [shuffledQuestions, sessionQuestionLimit]);

  const currentQ = useMemo(() => {
    if (!shuffledQuestions) return null;
    if (questionIndex < 0 || questionIndex >= effectiveLen) return null;
    return shuffledQuestions[questionIndex] ?? null;
  }, [shuffledQuestions, questionIndex, effectiveLen]);

  useEffect(() => {
    if (status !== "question_active" || !currentQ || !questionStartedAt) {
      setTimeUp(false);
      return;
    }
    const startedMs = new Date(questionStartedAt).getTime();
    const limitMs = currentQ.timeLimit * 1000;
    const tick = () => {
      const elapsed = Date.now() - startedMs;
      setTimeUp(elapsed >= limitMs);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [status, currentQ, questionStartedAt]);

  const hydrate = useCallback(async () => {
    const supabase = createSupabaseClient();
    const { data } = await supabase
      .from("sessions")
      .select(
        "status, current_question_index, quiz_id, question_count, question_seed, randomize_questions, current_question_started_at",
      )
      .eq("pin", normalizedPin)
      .maybeSingle();
    if (!data) {
      return;
    }
    setStatus(data.status as GameSession["status"]);
    setQuestionIndex(data.current_question_index as number);
    setAnswered(false);
    setRoundOutcome("loading");
    setPointsEarned(null);
    setSessionQuestionLimit((data.question_count as number | null) ?? null);
    setSessionSeed((data.question_seed as number | null) ?? null);
    setRandomizeQuestions((data.randomize_questions as boolean | null) ?? true);
    setQuestionStartedAt(
      (data.current_question_started_at as string | null) ?? null,
    );
    setTimeUp(false);
    const qz = data.quiz_id as string | null;
    if (qz) {
      const qs = await fetchOrderedQuizQuestionsPublic(supabase, qz);
      setQuestions(qs);
    } else {
      setQuestions([]);
    }
  }, [normalizedPin]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const prevQuestionIdxRef = useRef<number | null>(null);
  useEffect(() => {
    if (status === "question_active") {
      if (prevQuestionIdxRef.current !== questionIndex) {
        prevQuestionIdxRef.current = questionIndex;
      }
    }
  }, [status, questionIndex]);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const ch = supabase
      .channel(`player-sess:${normalizedPin}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `pin=eq.${normalizedPin}`,
        },
        (payload) => {
          const row = payload.new as GameSession;
          setStatus(row.status);
          setQuestionIndex(row.current_question_index);
          setSessionQuestionLimit(row.question_count ?? null);
          setSessionSeed(row.question_seed ?? null);
          setRandomizeQuestions(row.randomize_questions ?? true);
          setQuestionStartedAt(row.current_question_started_at ?? null);
          if (row.status === "finished") {
            setAnswered(true);
            setRoundOutcome("loading");
            setTimeUp(true);
          } else if (row.status === "question_active") {
            setAnswered(false);
            setRoundOutcome("loading");
            setPointsEarned(null);
            setTimeUp(false);
            setRankPos(null);
            setRankTotal(null);
          } else if (row.status === "showing_results") {
            setAnswered(true);
            setRoundOutcome("loading");
            setTimeUp(false);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [normalizedPin]);

  useEffect(() => {
    if (status === "finished") {
      router.replace(`/game/results/${encodeURIComponent(normalizedPin)}`);
    }
  }, [status, router, normalizedPin]);

  useEffect(() => {
    if (status !== "question_active") {
      return;
    }
    const id =
      typeof window !== "undefined"
        ? window.localStorage.getItem(LS_PLAYER_ID_KEY)
        : null;
    if (!id) {
      return;
    }

    void (async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("round_responses")
        .select("id")
        .eq("player_id", id)
        .eq("question_index", questionIndex)
        .maybeSingle();
      setAnswered(!!data);
    })();
  }, [status, questionIndex]);

  useEffect(() => {
    if (status !== "showing_results") {
      return;
    }
    const id =
      typeof window !== "undefined"
        ? window.localStorage.getItem(LS_PLAYER_ID_KEY)
        : null;
    if (!id) {
      return;
    }

    void (async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("round_responses")
        .select("selected_option_index, points_earned")
        .eq("player_id", id)
        .eq("question_index", questionIndex)
        .maybeSingle();

      if (!data) {
        setRoundOutcome("none");
        setPointsEarned(null);
        return;
      }

      const ok = (data.points_earned as number) > 0;
      setRoundOutcome(ok ? "correct" : "wrong");
      setPointsEarned(data.points_earned as number);

      const { data: sess } = await supabase
        .from("sessions")
        .select("id")
        .eq("pin", normalizedPin)
        .maybeSingle();
      const sid = sess?.id as string | undefined;
      if (!sid) {
        setRankPos(null);
        setRankTotal(null);
        return;
      }

      const { data: players } = await supabase
        .from("players")
        .select("id, score, joined_at")
        .eq("session_id", sid)
        .order("score", { ascending: false })
        .order("joined_at", { ascending: true });

      const list = (players ?? []) as Array<{
        id: string;
        score: number;
        joined_at: string;
      }>;
      setRankTotal(list.length);
      const idx = list.findIndex((p) => p.id === id);
      setRankPos(idx >= 0 ? idx + 1 : null);
    })();
  }, [status, questionIndex, shuffledQuestions, sessionQuestionLimit]);

  const pick = useCallback(
    async (optionIndex: number) => {
      if (answered || status !== "question_active") {
        return;
      }
      const playerId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(LS_PLAYER_ID_KEY)
          : null;
      const qid = currentQ?.id;
      if (!playerId || !qid) {
        setError("Lipsește jucătorul sau întrebarea.");
        return;
      }

      setError(null);
      setBusyIndex(optionIndex);
      setPickedOption(optionIndex);
      try {
        const result = await submitAnswer(
          normalizedPin,
          playerId,
          qid,
          optionIndex,
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setAnswered(true);
      } finally {
        setBusyIndex(null);
      }
    },
    [answered, normalizedPin, status, currentQ],
  );

  if (status === "finished") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Gata!</h1>
        <button
          type="button"
          onClick={() =>
            router.push(
              `/game/results/${encodeURIComponent(normalizedPin)}`,
            )
          }
          className="rounded-xl bg-[var(--foreground)] px-6 py-3 font-semibold text-[var(--background)]"
        >
          Vezi clasamentul
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-xl border border-[var(--foreground)]/25 px-6 py-3 font-medium"
        >
          Acasă
        </button>
      </div>
    );
  }

  if (status === "lobby") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-[var(--foreground)]/75">Chill, Adminul setează tot…</p>
        <Link href="/join" className="text-sm underline">
          Join
        </Link>
      </div>
    );
  }

  if (status === "showing_results") {
    const tone =
      roundOutcome === "correct"
        ? "bg-emerald-600 text-white"
        : roundOutcome === "wrong"
          ? "bg-red-600 text-white"
          : roundOutcome === "none"
            ? "bg-amber-700 text-white"
            : "bg-zinc-700 text-white";

    const icon =
      roundOutcome === "correct"
        ? "✓"
        : roundOutcome === "wrong"
          ? "✕"
          : roundOutcome === "none"
            ? "⏱"
            : "";

    const encouragement =
      roundOutcome === "correct"
        ? "Ești tare! 🔥"
        : roundOutcome === "wrong"
          ? "Nu-i nimic, te scoți la următoarea! ⚡"
          : roundOutcome === "none"
            ? "Ține aproape — urmează runda următoare."
            : "";

    return (
      <div
        className={`flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center transition-colors ${tone}`}
      >
        <AnimatePresence mode="wait">
          {roundOutcome === "loading" ? (
            <motion.p
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.95, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="text-lg font-medium"
            >
              Se încarcă…
            </motion.p>
          ) : (
            <motion.div
              key={roundOutcome}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="grid size-24 place-items-center rounded-full bg-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.18)_inset]">
                <span className="text-5xl font-black leading-none" aria-hidden>
                  {icon}
                </span>
              </div>

              <div className="space-y-1">
                {roundOutcome === "correct" ? (
                  <p className="text-4xl font-black sm:text-5xl">Ești tare! 🔥</p>
                ) : roundOutcome === "wrong" ? (
                  <p className="text-4xl font-black sm:text-5xl">
                    Nu-i nimic, te scoți la următoarea! ⚡
                  </p>
                ) : (
                  <p className="text-3xl font-black sm:text-4xl">Fără răspuns</p>
                )}
                <p className="text-sm font-semibold opacity-90">
                  {encouragement}
                </p>
              </div>

              {(rankPos != null || rankTotal != null) && (
                <div className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold shadow-[0_0_0_1px_rgba(255,255,255,0.16)_inset]">
                  <span className="opacity-90">Locul tău:</span>{" "}
                  <span className="font-mono tabular-nums">
                    {rankPos ?? "—"}
                  </span>
                  {rankTotal != null ? (
                    <>
                      {" "}
                      <span className="opacity-80">din</span>{" "}
                      <span className="font-mono tabular-nums">{rankTotal}</span>
                    </>
                  ) : null}
                </div>
              )}

              {pointsEarned != null && roundOutcome === "correct" && (
                <p className="text-xl font-semibold tabular-nums">
                  +{pointsEarned} puncte
                </p>
              )}

              <p className="max-w-sm text-sm opacity-90">
                Chill, Adminul dă drumul la următoarea.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // `effectiveLen` + `currentQ` sunt calculate mai sus (memo) pentru a fi folosite și în callback-uri.
  const optionCount = currentQ?.options.length ?? 0;

  return (
    <div
      onPointerDown={audio.unlocked ? undefined : audio.unlock}
      className="min-h-dvh bg-zinc-900 p-3 sm:p-4"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`q-${questionIndex}-${currentQ?.id ?? "none"}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mx-auto grid max-w-lg grid-cols-2 gap-3 sm:max-w-xl sm:gap-4"
        >
          {KAHOOT_CELLS.map((cell, i) => (
            <button
              key={i}
              type="button"
              disabled={
                answered ||
                busyIndex !== null ||
                i >= optionCount ||
                timeUp ||
                questions === null
              }
              aria-label={cell.label}
              onClick={() => pick(i)}
              className={`flex aspect-[4/3] max-h-[42vh] items-center justify-center rounded-2xl text-5xl shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50 sm:text-6xl ${cell.className}`}
            >
              <span className="drop-shadow-md">{cell.shape}</span>
            </button>
          ))}
        </motion.div>
      </AnimatePresence>
      {status === "question_active" && timeUp && !answered && (
        <p className="mt-6 text-center text-sm font-semibold text-white/90">
          Timp expirat.
        </p>
      )}
      {answered && (
        <p className="mt-6 text-center text-sm font-medium leading-relaxed text-white/95">
          Confirmat{pickedOption != null ? ` (opțiunea ${pickedOption + 1})` : ""}! Chill, ceilalți încă se gândesc...
        </p>
      )}
      {error != null && (
        <p className="mt-4 px-4 text-center text-sm text-red-300">{error}</p>
      )}
    </div>
  );
}
