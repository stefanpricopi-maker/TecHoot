"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { animate } from "framer-motion/dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { submitAnswer } from "@/app/actions/game-actions";
import type { PublicQuizQuestionData } from "@/lib/quiz-db";
import { fetchOrderedQuizQuestionsPublic } from "@/lib/quiz-db";
import { hashStringToSeed, seededShuffle } from "@/lib/seeded-shuffle";
import { LS_PLAYER_ID_KEY } from "@/lib/player-storage";
import { createSupabaseClient } from "@/lib/supabase";
import { useGameAudio } from "@/hooks/useGameAudio";
import type { GameSession } from "@/types/game";

export const KAHOOT_CELLS = [
  {
    shape: "1",
    label: "Opțiunea 1 (roșu)",
    className:
      "bg-red-500 text-white shadow-[inset_0_2px_0_0_rgba(255,255,255,0.22),inset_0_-2px_6px_rgba(0,0,0,0.18)]",
  },
  {
    shape: "2",
    label: "Opțiunea 2 (albastru)",
    className:
      "bg-blue-600 text-white shadow-[inset_0_2px_0_0_rgba(255,255,255,0.2),inset_0_-2px_6px_rgba(0,0,0,0.2)]",
  },
  {
    shape: "3",
    label: "Opțiunea 3 (galben)",
    className:
      "bg-amber-400 text-zinc-900 shadow-[inset_0_2px_0_0_rgba(255,255,255,0.35),inset_0_-2px_6px_rgba(0,0,0,0.12)]",
  },
  {
    shape: "4",
    label: "Opțiunea 4 (verde)",
    className:
      "bg-green-600 text-white shadow-[inset_0_2px_0_0_rgba(255,255,255,0.18),inset_0_-2px_6px_rgba(0,0,0,0.2)]",
  },
] as const;

function questionTextSizeClass(text: string): string {
  const len = text.trim().length;
  if (len >= 240) return "text-lg sm:text-xl";
  if (len >= 170) return "text-xl sm:text-2xl";
  return "text-xl sm:text-2xl";
}

type PlayerGameClientProps = {
  normalizedPin: string;
};

function AnimatedScore({
  value,
  durationMs = 1000,
}: {
  value: number;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState<number>(value);
  const prevRef = useRef<number>(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;

    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) {
      setDisplay(to);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <>{display}</>;
}

export function PlayerGameClient({ normalizedPin }: PlayerGameClientProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<GameSession["status"]>("lobby");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [roundOutcome, setRoundOutcome] = useState<
    "loading" | "correct" | "wrong" | "none"
  >("loading");
  const reduceTapMotion = useReducedMotion();
  const isHurry =
    status === "question_active" &&
    timeLeftSeconds != null &&
    Number(timeLeftSeconds) <= 5;
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
  const [leaderTop, setLeaderTop] = useState<
    { id: string; display_name: string; score: number }[]
  >([]);
  const [intermissionPhase, setIntermissionPhase] = useState<
    "idle" | "base_loaded" | "final_loaded"
  >("idle");
  const prevLeaderRanksRef = useRef<Record<string, number>>({});
  const [leaderMove, setLeaderMove] = useState<
    Record<string, "up" | "down" | "same" | "new">
  >({});
  const [leaderLayoutReady, setLeaderLayoutReady] = useState(false);
  const [intermissionLeft, setIntermissionLeft] = useState<number | null>(null);

  type LeaderTopRow = { id: string; display_name: string | null; score: number };

  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;

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
      setTimeLeftSeconds(null);
      return;
    }
    const startedMs = new Date(questionStartedAt).getTime();
    const limitMs = currentQ.timeLimit * 1000;
    const tick = () => {
      const elapsed = Date.now() - startedMs;
      const remaining = Math.max(0, limitMs - elapsed);
      setTimeLeftSeconds(Math.ceil(remaining / 1000));
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
        "id, status, current_question_index, quiz_id, question_count, question_seed, randomize_questions, current_question_started_at",
      )
      .eq("pin", normalizedPin)
      .maybeSingle();
    if (!data) {
      return;
    }
    setSessionId((data.id as string | null) ?? null);
    setStatus(data.status as GameSession["status"]);
    setQuestionIndex(data.current_question_index as number);
    setAnswered(false);
    setRoundOutcome("loading");
    setPointsEarned(null);
    setPickedOption(null);
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

  const refreshTop5 = useCallback(
    async (sid: string) => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("players")
        .select("id, display_name, score")
        .eq("session_id", sid)
        .order("score", { ascending: false })
        .limit(5);
      const rows = (data ?? []) as unknown as LeaderTopRow[];
      setLeaderTop(
        rows.map((p) => ({
          id: p.id,
          display_name: p.display_name ?? "—",
          score: p.score ?? 0,
        })),
      );
    },
    [],
  );

  const refreshTop5BaseBeforeLastRound = useCallback(
    async (sid: string, prevQuestionIdx: number) => {
      const supabase = createSupabaseClient();
      const [playersRes, respRes] = await Promise.all([
        supabase
          .from("players")
          .select("id, display_name, score, joined_at")
          .eq("session_id", sid),
        supabase
          .from("round_responses")
          .select("player_id, points_earned")
          .eq("session_id", sid)
          .eq("question_index", prevQuestionIdx),
      ]);

      const plist = (playersRes.data ?? []) as Array<{
        id: string;
        display_name: string | null;
        score: number | null;
        joined_at: string;
      }>;
      const rlist = (respRes.data ?? []) as Array<{
        player_id: string;
        points_earned: number | null;
      }>;

      const pointsByPlayer = new Map<string, number>();
      for (const r of rlist) {
        pointsByPlayer.set(r.player_id, Number(r.points_earned ?? 0));
      }

      const adjusted = plist.map((p) => {
        const cur = Number(p.score ?? 0);
        const delta = pointsByPlayer.get(p.id) ?? 0;
        return {
          id: p.id,
          display_name: p.display_name ?? "—",
          score: Math.max(0, cur - delta),
          joined_at: p.joined_at,
        };
      });

      adjusted.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
      });

      setLeaderTop(adjusted.slice(0, 5).map((p) => ({ id: p.id, display_name: p.display_name, score: p.score })));
      setIntermissionPhase("base_loaded");
    },
    [],
  );

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const prev = prevLeaderRanksRef.current;
    const next: Record<string, "up" | "down" | "same" | "new"> = {};
    for (let i = 0; i < leaderTop.length; i++) {
      const id = leaderTop[i]!.id;
      const prevIdx = prev[id];
      if (typeof prevIdx !== "number") {
        next[id] = "new";
      } else if (prevIdx > i) {
        next[id] = "up";
      } else if (prevIdx < i) {
        next[id] = "down";
      } else {
        next[id] = "same";
      }
    }
    setLeaderMove(next);
    prevLeaderRanksRef.current = Object.fromEntries(
      leaderTop.map((p, i) => [p.id, i]),
    );
  }, [leaderTop]);

  useEffect(() => {
    const isIntermission =
      status === "question_active" && questionStartedAt == null && !!sessionId;
    if (!isIntermission) {
      setIntermissionLeft(null);
      setIntermissionPhase("idle");
      return;
    }
    setIntermissionLeft(3);
    const id = window.setInterval(() => {
      setIntermissionLeft((s) => {
        if (s == null) return null;
        return Math.max(0, s - 1);
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [status, questionStartedAt, sessionId]);

  // When intermission starts, show base scores first.
  useEffect(() => {
    const isIntermission =
      status === "question_active" && questionStartedAt == null && !!sessionId;
    if (!isIntermission || !sessionId) return;
    void refreshTop5BaseBeforeLastRound(sessionId, Math.max(0, questionIndex - 1));
  }, [status, questionStartedAt, sessionId, questionIndex, refreshTop5BaseBeforeLastRound]);

  useEffect(() => {
    if (leaderTop.length === 0) {
      setLeaderLayoutReady(false);
      return;
    }
    if (leaderLayoutReady) return;
    // Phase 1: let rows appear first. Phase 2: enable layout glide.
    const t = window.setTimeout(() => setLeaderLayoutReady(true), 260);
    return () => window.clearTimeout(t);
  }, [leaderTop.length, leaderLayoutReady]);

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
            setPickedOption(null);
            if (sessionIdRef.current) {
              void refreshTop5(sessionIdRef.current);
            }
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
  }, [normalizedPin, refreshTop5]);

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
      type RoundResponseMini = {
        selected_option_index: number | null;
        points_earned: number | null;
      };
      let data: RoundResponseMini | null = null;
      // Race-proof: status can flip to showing_results before the answer row is visible.
      for (let attempt = 0; attempt < 12; attempt++) {
        const res = await supabase
          .from("round_responses")
          .select("selected_option_index, points_earned")
          .eq("player_id", id)
          .eq("question_index", questionIndex)
          .maybeSingle();
        data = (res.data as RoundResponseMini | null) ?? null;
        if (data) break;
        await new Promise((r) => setTimeout(r, 200));
      }

      if (!data) {
        setRoundOutcome("none");
        setPointsEarned(null);
        return;
      }

      const ok = Number(data.points_earned ?? 0) > 0;
      setRoundOutcome(ok ? "correct" : "wrong");
      setPointsEarned((data.points_earned ?? null) as number | null);

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
  }, [status, questionIndex, normalizedPin, shuffledQuestions, sessionQuestionLimit]);

  const pick = useCallback(
    async (optionIndex: number) => {
      if (status !== "question_active") {
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
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center text-gray-100">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#f59e0b]">
          Gata!
        </h1>
        <button
          type="button"
          onClick={() =>
            router.push(
              `/game/results/${encodeURIComponent(normalizedPin)}`,
            )
          }
          className="min-h-12 rounded-2xl bg-[#f59e0b] px-8 py-3 font-bold text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Vezi clasamentul
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="min-h-12 rounded-2xl border border-gray-700/50 bg-[#1a2236] px-8 py-3 font-semibold text-gray-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Acasă
        </button>
      </div>
    );
  }

  if (status === "lobby") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center text-gray-100">
        <p className="text-lg text-gray-400">Chill, Adminul setează tot…</p>
        <Link
          href="/join"
          className="text-sm font-semibold text-[#f59e0b] underline-offset-4 hover:underline"
        >
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
          ? "Răspuns greșit!"
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
              <div className="grid size-24 place-items-center rounded-full bg-white/10 shadow-[0_0_0_1px_rgba(245,158,11,0.22)_inset]">
                <span className="text-5xl font-black leading-none" aria-hidden>
                  {icon}
                </span>
              </div>

              <div className="space-y-1">
                {roundOutcome === "correct" ? (
                  <p className="text-4xl font-black sm:text-5xl">Ești tare! 🔥</p>
                ) : roundOutcome === "wrong" ? (
                  <p className="text-4xl font-black sm:text-5xl">
                    Răspuns greșit!
                  </p>
                ) : (
                  <p className="text-3xl font-black sm:text-4xl">Fără răspuns</p>
                )}
                
              </div>

              {pointsEarned != null && roundOutcome === "correct" && (
                <p className="text-xl font-semibold tabular-nums">
                  +{pointsEarned} puncte
                </p>
              )}

              <p className="max-w-sm text-sm font-semibold opacity-90">
                Întrebări rămase:{" "}
                <span className="font-mono tabular-nums">
                  {Math.max(0, effectiveLen - (questionIndex + 1))}
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (status === "question_active" && questionStartedAt == null && sessionId) {
    const maxScore = Math.max(1, ...leaderTop.map((p) => p.score));
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e]/40 px-6 py-10 text-gray-100 backdrop-blur-sm">
        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onAnimationComplete={() => {
              if (
                intermissionPhase === "base_loaded" &&
                sessionId &&
                status === "question_active" &&
                questionStartedAt == null
              ) {
                void refreshTop5(sessionId);
                setIntermissionPhase("final_loaded");
              }
            }}
            className="mb-8 text-center"
          >
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#f59e0b] sm:text-3xl">
              Fii gata în{" "}
              {intermissionLeft != null ? (
                <span className="tabular-nums">{intermissionLeft}</span>
              ) : null}{" "}
              secunde
            </h2>
            {null}
          </motion.div>

          <motion.ul layout={leaderLayoutReady} className="space-y-4">
            {leaderTop.slice(0, 5).map((p, i) => (
              <motion.li
                key={p.id}
                layout={leaderLayoutReady ? "position" : false}
                layoutId={`pl-leader-${p.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  layout: {
                    type: "tween",
                    duration: leaderLayoutReady ? 1 : 0,
                    ease: [0.22, 1, 0.36, 1],
                  },
                  opacity: { duration: 0.18 },
                }}
                className={`rounded-2xl border border-gray-700/50 bg-[#1a2236] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ${
                  leaderMove[p.id] === "up"
                    ? "shadow-[0_0_0_2px_rgba(16,185,129,0.22)_inset]"
                    : leaderMove[p.id] === "down"
                      ? "shadow-[0_0_0_2px_rgba(248,113,113,0.22)_inset]"
                      : ""
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex w-8 shrink-0 items-center justify-center tabular-nums text-sm font-bold text-gray-400">
                      {i === 0 ? (
                        <span aria-hidden>👑</span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span>{i + 1}.</span>
                          {leaderMove[p.id] === "up" ? (
                            <motion.span
                              key={`up-${p.id}`}
                              initial={{ opacity: 0, y: 6, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.95 }}
                              transition={{ duration: 0.18 }}
                              className="text-emerald-300"
                              aria-label="Urcă în clasament"
                            >
                              ▲
                            </motion.span>
                          ) : leaderMove[p.id] === "down" ? (
                            <motion.span
                              key={`down-${p.id}`}
                              initial={{ opacity: 0, y: -6, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.95 }}
                              transition={{ duration: 0.18 }}
                              className="text-red-300"
                              aria-label="Coboară în clasament"
                            >
                              ▼
                            </motion.span>
                          ) : null}
                        </span>
                      )}
                    </span>
                    <span className="truncate font-semibold text-gray-100">
                      {p.display_name}
                    </span>
                  </span>
                  <span className="font-mono text-sm font-extrabold tabular-nums text-[#f59e0b]">
                    <AnimatedScore value={p.score} durationMs={1000} />
                  </span>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    );
  }

  // `effectiveLen` + `currentQ` sunt calculate mai sus (memo) pentru a fi folosite și în callback-uri.
  const optionCount = currentQ?.options.length ?? 0;

  return (
    <div
      onPointerDown={audio.unlocked ? undefined : audio.unlock}
      className={`min-h-dvh bg-[#0a0f1e]/40 p-6 backdrop-blur-sm sm:p-8 ${
        isHurry
          ? "relative before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.22)_0%,_rgba(10,15,30,0)_62%)] before:animate-pulse"
          : ""
      }`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`q-head-${questionIndex}-${currentQ?.id ?? "none"}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="mx-auto mb-6 max-w-lg rounded-2xl border border-white/12 bg-[#1a2236]/35 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.14)] backdrop-blur-2xl sm:mb-8 sm:max-w-xl sm:p-8"
        >
          <div className="flex-1">
            <p className="text-left text-sm font-semibold text-gray-400">
              Întrebarea {questionIndex + 1} / {effectiveLen || "—"}
            </p>
            <p
              className={`mt-3 whitespace-pre-wrap break-words font-extrabold leading-snug tracking-tight text-gray-100 ${questionTextSizeClass(
                currentQ?.text ?? "",
              )}`}
            >
              {currentQ?.text ?? "Întrebare…"}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.div
          key={`q-${questionIndex}-${currentQ?.id ?? "none"}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.28 }}
          className="mx-auto grid max-w-lg grid-cols-2 gap-4 sm:max-w-xl sm:gap-5"
        >
          {KAHOOT_CELLS.map((cell, i) => {
            const optionLabel =
              currentQ != null && i < optionCount
                ? (currentQ.options[i] ?? "")
                : "";
            const disabled =
              busyIndex !== null ||
              i >= optionCount ||
              timeUp ||
              questions === null;
            const isChosen = pickedOption === i;
            const dimOthers = answered && pickedOption != null && !isChosen;
            return (
              <motion.button
                key={i}
                type="button"
                disabled={disabled}
                aria-label={
                  optionLabel
                    ? `${cell.label}: ${optionLabel}`
                    : cell.label
                }
                aria-pressed={isChosen}
                onTap={(e) => {
                  if (disabled) return;
                  const el = e.currentTarget;
                  if (
                    !reduceTapMotion &&
                    el instanceof HTMLButtonElement
                  ) {
                    void animate(
                      el,
                      { scale: [1, 1.13, 1], y: [0, -6, 0] },
                      {
                        type: "spring",
                        stiffness: 520,
                        damping: 17,
                        mass: 0.55,
                      },
                    );
                  }
                  pick(i);
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.04 + i * 0.05 }}
                whileHover={
                  disabled ? undefined : { scale: 1.02 }
                }
                className={`flex min-h-[9.5rem] flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-5xl shadow-none transition-[box-shadow,opacity] disabled:hover:scale-100 sm:min-h-[11rem] sm:gap-2.5 sm:text-6xl ${cell.className} ${
                  isChosen
                    ? "box-border border-4 border-white"
                    : "border-4 border-transparent"
                } ${dimOthers ? "opacity-45" : ""}`}
              >
                <span
                  className={`shrink-0 drop-shadow-md ${
                    isChosen
                      ? i === 2
                        ? "text-zinc-900/45"
                        : "text-white/45"
                      : ""
                  }`}
                >
                  {cell.shape}
                </span>
                {optionLabel ? (
                  <span
                    className={`line-clamp-3 w-full max-w-[95%] text-center text-xs font-bold leading-snug drop-shadow-sm sm:text-sm ${
                      isChosen
                        ? i === 2
                          ? "text-zinc-900/45"
                          : "text-white/45"
                        : i === 2
                          ? "text-zinc-900/95"
                          : "text-white/95"
                    }`}
                  >
                    {optionLabel}
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>
      <div className="mx-auto mt-5 flex max-w-lg justify-center sm:mt-6 sm:max-w-xl">
        <div className="rounded-2xl border border-gray-700/50 bg-[#1a2236] px-6 py-3 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Timp
          </p>
          <p className="font-mono text-2xl font-extrabold tabular-nums leading-none text-[#f59e0b]">
            {timeLeftSeconds ?? "—"}
          </p>
        </div>
      </div>
      {status === "question_active" && timeUp && !answered && (
        <p className="mt-8 text-center text-sm font-semibold text-gray-400">
          Timp expirat.
        </p>
      )}
      {error != null && (
        <p className="mt-6 px-4 text-center text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
