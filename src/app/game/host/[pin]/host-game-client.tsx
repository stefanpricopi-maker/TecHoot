"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import {
  proceedAfterResults,
  getHostCorrectOptionIndex,
  showRoundResults,
  startCurrentQuestionTimer,
} from "@/app/actions/game-actions";
import type { PublicQuizQuestionData } from "@/lib/quiz-db";
import { fetchOrderedQuizQuestionsPublic } from "@/lib/quiz-db";
import { hashStringToSeed, seededShuffle } from "@/lib/seeded-shuffle";
import { createSupabaseClient } from "@/lib/supabase";
import { useGameAudio } from "@/hooks/useGameAudio";
import type { GameSession } from "@/types/game";

type PlayStatus = GameSession["status"];

type HostGameClientProps = {
  normalizedPin: string;
};

export function HostGameClient({ normalizedPin }: HostGameClientProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [status, setStatus] = useState<PlayStatus>("lobby");
  const [playersCount, setPlayersCount] = useState(0);
  const [responseCount, setResponseCount] = useState(0);
  const [sessionQuestionLimit, setSessionQuestionLimit] = useState<number | null>(
    null,
  );
  const [sessionSeed, setSessionSeed] = useState<number | null>(null);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [questionStartedAt, setQuestionStartedAt] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);

  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<PublicQuizQuestionData[] | null>(null);
  const [correctIdx, setCorrectIdx] = useState<number | null>(null);

  /** Rezumat după „Afișează rezultatele” (încărcat din DB). */
  const [roundBreakdown, setRoundBreakdown] = useState<{
    answered: number;
    correct: number;
    playersTotal: number;
    perOption: [number, number, number, number];
  } | null>(null);

  const [leaderTop, setLeaderTop] = useState<
    { id: string; display_name: string; score: number }[]
  >([]);

  type LeaderTopRow = { id: string; display_name: string | null; score: number };

  const [showIntermission, setShowIntermission] = useState(false);

  const [liveVotes, setLiveVotes] = useState<[number, number, number, number]>([
    0, 0, 0, 0,
  ]);

  const OPTION_TONES: Array<{ label: string; bar: string }> = [
    { label: "Roșu ▲", bar: "from-red-500 to-red-400" },
    { label: "Albastru ◆", bar: "from-blue-600 to-blue-400" },
    { label: "Galben ●", bar: "from-amber-400 to-amber-300" },
    { label: "Verde ■", bar: "from-emerald-600 to-emerald-400" },
  ];

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionIndexRef = useRef(0);
  questionIndexRef.current = questionIndex;
  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;

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
    if (sessionQuestionLimit == null) {
      return len;
    }
    if (!Number.isFinite(sessionQuestionLimit) || sessionQuestionLimit <= 0) {
      return len;
    }
    return Math.min(len, Math.floor(sessionQuestionLimit));
  }, [shuffledQuestions, sessionQuestionLimit]);

  const question = useMemo(() => {
    if (!shuffledQuestions) return null;
    if (questionIndex < 0 || questionIndex >= effectiveLen) return null;
    return shuffledQuestions[questionIndex] ?? null;
  }, [shuffledQuestions, questionIndex, effectiveLen]);

  const quizLen = effectiveLen;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const audio = useGameAudio({
    role: "host",
    status,
    timeLeft,
  });

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

  const prevQuestionIdxRef = useRef<number | null>(null);
  useEffect(() => {
    if (status === "question_active") {
      if (prevQuestionIdxRef.current !== questionIndex) {
        prevQuestionIdxRef.current = questionIndex;
        if (sessionId) {
          void refreshTop5(sessionId);
        }
        setShowIntermission(true);
        const id = window.setTimeout(() => setShowIntermission(false), 10_000);
        return () => window.clearTimeout(id);
      }
    }
  }, [status, questionIndex, sessionId, refreshTop5]);

  const refreshResponseCount = useCallback(
    async (sid: string, qIdx: number) => {
      const supabase = createSupabaseClient();
      const { count, error } = await supabase
        .from("round_responses")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sid)
        .eq("question_index", qIdx);
      if (!error && count != null) {
        setResponseCount(count);
      }
    },
    [],
  );

  const refreshLiveVotes = useCallback(async (sid: string, qIdx: number) => {
    const supabase = createSupabaseClient();
    const { data } = await supabase
      .from("round_responses")
      .select("selected_option_index")
      .eq("session_id", sid)
      .eq("question_index", qIdx);
    const per: [number, number, number, number] = [0, 0, 0, 0];
    for (const row of data ?? []) {
      const i = row.selected_option_index as number;
      if (i >= 0 && i <= 3) {
        per[i] += 1;
      }
    }
    setLiveVotes(per);
  }, []);

  const hydrateSession = useCallback(async () => {
    const supabase = createSupabaseClient();
    const { data: sess, error } = await supabase
      .from("sessions")
      .select(
        "id, current_question_index, status, quiz_id, question_count, question_seed, randomize_questions, current_question_started_at, created_at, started_at, quizzes(title)",
      )
      .eq("pin", normalizedPin)
      .maybeSingle();

    if (error || !sess) {
      return;
    }

    const sid = sess.id as string;
    setSessionId(sid);
    setQuestionIndex(sess.current_question_index as number);
    setStatus(sess.status as PlayStatus);
    setSessionQuestionLimit((sess.question_count as number | null) ?? null);
    setSessionSeed((sess.question_seed as number | null) ?? null);
    setRandomizeQuestions((sess.randomize_questions as boolean | null) ?? true);
    setQuestionStartedAt((sess.current_question_started_at as string | null) ?? null);
    setCreatedAt((sess.created_at as string | null) ?? null);
    setStartedAt((sess.started_at as string | null) ?? null);
    setQuizTitle(((sess as any).quizzes?.title as string | null) ?? null);

    const qz = sess.quiz_id as string | null;
    if (qz) {
      const qs = await fetchOrderedQuizQuestionsPublic(supabase, qz);
      setQuestions(qs);
    } else {
      setQuestions([]);
    }

    const { count: pc } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sid);
    setPlayersCount(pc ?? 0);

    if (sess.status === "question_active") {
      await refreshResponseCount(sid, sess.current_question_index as number);
      await refreshLiveVotes(sid, sess.current_question_index as number);
      await refreshTop5(sid);
    }
  }, [normalizedPin, refreshResponseCount, refreshLiveVotes, refreshTop5]);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (status === "finished") {
      router.replace(`/game/results/${encodeURIComponent(normalizedPin)}`);
    }
  }, [status, router, normalizedPin]);

  useEffect(() => {
    if (status !== "question_active" || question == null) {
      stopTimer();
      setTimeUp(false);
      if (status !== "question_active") {
        setTimeLeft(null);
      }
      return;
    }
    if (!questionStartedAt) {
      stopTimer();
      setTimeLeft(question.timeLimit);
      setTimeUp(false);
      return;
    }
    stopTimer();
    setTimeUp(false);
    const startedMs = new Date(questionStartedAt).getTime();
    const limitMs = question.timeLimit * 1000;
    const tick = () => {
      const elapsed = Date.now() - startedMs;
      const left = Math.max(0, Math.ceil((limitMs - elapsed) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        setTimeUp(true);
        stopTimer();
      }
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => stopTimer();
  }, [status, questionIndex, question, questionStartedAt, stopTimer]);

  /** Reîmprospătare periodică: contorul nu rămâne 0 când RLS blochează count/Realtime pe `round_responses`. */
  useEffect(() => {
    if (!sessionId || status !== "question_active") {
      return;
    }
    const tick = () => {
      const sid = sessionIdRef.current;
      const q = questionIndexRef.current;
      if (sid) {
        void refreshResponseCount(sid, q);
        void refreshLiveVotes(sid, q);
      }
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, [sessionId, status, questionIndex, refreshResponseCount, refreshLiveVotes]);

  useEffect(() => {
    if (status !== "showing_results" || !sessionId || question == null) {
      setRoundBreakdown(null);
      setLeaderTop([]);
      setCorrectIdx(null);
      return;
    }

    void (async () => {
      const res = await getHostCorrectOptionIndex(sessionId);
      if (res.ok) {
        setCorrectIdx(res.correctIndex);
      }
    })();

    const qIdx = questionIndex;

    void (async () => {
      const supabase = createSupabaseClient();
      const [respRes, playersRes, topRes] = await Promise.all([
        supabase
          .from("round_responses")
          .select("selected_option_index")
          .eq("session_id", sessionId)
          .eq("question_index", qIdx),
        supabase
          .from("players")
          .select("*", { count: "exact", head: true })
          .eq("session_id", sessionId),
        supabase
          .from("players")
          .select("id, display_name, score")
          .eq("session_id", sessionId)
          .order("score", { ascending: false })
          .limit(5),
      ]);

      const rows = respRes.data ?? [];
      const perOption: [number, number, number, number] = [0, 0, 0, 0];
      for (const row of rows) {
        const i = row.selected_option_index as number;
        if (i >= 0 && i <= 3) {
          perOption[i] += 1;
        }
      }
      const idxCorrect = correctIdx;
      const correct =
        typeof idxCorrect === "number"
          ? rows.filter((r) => (r.selected_option_index as number) === idxCorrect)
              .length
          : 0;

      setRoundBreakdown({
        answered: rows.length,
        correct,
        playersTotal: playersRes.count ?? 0,
        perOption,
      });

      const topRows = (topRes.data ?? []) as unknown as LeaderTopRow[];
      setLeaderTop(
        topRows.map((p) => ({
          id: p.id,
          display_name: p.display_name ?? "—",
          score: p.score ?? 0,
        })),
      );
    })();
  }, [status, sessionId, questionIndex, question, correctIdx]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const supabase = createSupabaseClient();

    const chSession = supabase
      .channel(`host-sess-pin:${normalizedPin}`)
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
          setQuestionIndex(row.current_question_index);
          setStatus(row.status);
          setQuestionStartedAt(row.current_question_started_at ?? null);
          setStartedAt(row.started_at ?? null);
          if (row.status === "question_active") {
            void refreshResponseCount(
              sessionId,
              row.current_question_index,
            );
            setLiveVotes([0, 0, 0, 0]);
            void refreshLiveVotes(sessionId, row.current_question_index);
            void refreshTop5(sessionId);
          }
          if (row.status === "finished") {
            stopTimer();
            setTimeLeft(null);
            setTimeUp(true);
          }
        },
      )
      .subscribe();

    const chPlayers = supabase
      .channel(`host-pl-game:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `session_id=eq.${sessionId}`,
        },
        () => setPlayersCount((c) => c + 1),
      )
      .subscribe();

    const chPlayersUpdate = supabase
      .channel(`host-pl-upd:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void refreshTop5(sessionId);
        },
      )
      .subscribe();

    const chResp = supabase
      .channel(`host-resp:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "round_responses",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            question_index: number;
            selected_option_index: number;
          };
          if (row.question_index === questionIndexRef.current) {
            setResponseCount((r) => r + 1);
            const i = row.selected_option_index;
            if (i >= 0 && i <= 3) {
              setLiveVotes((prev) => {
                const out: [number, number, number, number] = [
                  prev[0],
                  prev[1],
                  prev[2],
                  prev[3],
                ];
                out[i] = (out[i] ?? 0) + 1;
                return out;
              });
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(chSession);
      void supabase.removeChannel(chPlayers);
      void supabase.removeChannel(chPlayersUpdate);
      void supabase.removeChannel(chResp);
    };
  }, [
    sessionId,
    normalizedPin,
    refreshResponseCount,
    refreshLiveVotes,
    stopTimer,
    status,
  ]);

  const canShowResults =
    status === "question_active" &&
    question != null &&
    (timeUp || (playersCount > 0 && responseCount >= playersCount));

  const handleShowResults = useCallback(async () => {
    if (!sessionId || !canShowResults) {
      return;
    }
    setActionErr(null);
    setBusy(true);
    try {
      const result = await showRoundResults(sessionId);
      if (!result.ok) {
        setActionErr(result.error);
        return;
      }
      // Optimistic UI: don't depend solely on Realtime.
      setStatus("showing_results");
      stopTimer();
      setTimeLeft(null);
      setShowIntermission(false);
    } finally {
      setBusy(false);
    }
  }, [sessionId, canShowResults, stopTimer]);

  const handleProceed = useCallback(async () => {
    if (!sessionId || status !== "showing_results") {
      return;
    }
    setActionErr(null);
    setBusy(true);
    try {
      const result = await proceedAfterResults(sessionId);
      if (!result.ok) {
        setActionErr(result.error);
        return;
      }
      if (!result.finished) {
        setTimeUp(false);
        setResponseCount(0);
        setLiveVotes([0, 0, 0, 0]);
        setStatus("question_active");
        setQuestionIndex((i) => i + 1);
        setQuestionStartedAt(null);
        setShowIntermission(true);
        window.setTimeout(() => {
          setShowIntermission(false);
          void startCurrentQuestionTimer(sessionId);
        }, 10_000);
      }
    } finally {
      setBusy(false);
    }
  }, [sessionId, status]);

  if (!sessionId && status === "lobby") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-[var(--foreground)]/70">Se încarcă sesiunea…</p>
      </div>
    );
  }

  if (status === "lobby") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-[var(--foreground)]/80">
          Jocul n-a pornit încă. Dă-i start din pagina de Admin.
        </p>
        <p className="text-2xl font-bold tabular-nums tracking-widest">
          {normalizedPin}
        </p>
        <Link href="/host" className="underline">
          La Admin
        </Link>
      </div>
    );
  }

  if (status === "finished") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Joc terminat</h1>
        <Link
          href={`/game/results/${encodeURIComponent(normalizedPin)}`}
          className="rounded-xl bg-[var(--foreground)] px-6 py-3 font-semibold text-[var(--background)]"
        >
          Vezi clasamentul
        </Link>
        <Link href="/host" className="font-medium underline opacity-80">
          Înapoi la Admin
        </Link>
      </div>
    );
  }

  if (status === "showing_results" && question == null) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-[var(--foreground)]/70">Date indisponibile.</p>
      </div>
    );
  }

  if (status === "showing_results" && question != null) {
    const isLastRound = questionIndex >= quizLen - 1;
    const idx = correctIdx;
    const maxScore = Math.max(1, ...leaderTop.map((p) => p.score));

    return (
      <div className="mx-auto min-h-dvh max-w-2xl px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <header className="mb-6 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-[var(--foreground)]/55">
            Rezultate rundă
          </p>
          <p className="mt-1 text-xs text-[var(--foreground)]/50">
            Întrebarea {questionIndex + 1} din {quizLen}
            {isLastRound ? " · ultima întrebare" : ""}
          </p>
          <AnimatePresence mode="wait">
            <motion.h1
              key={`sr-q-${questionIndex}-${question.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-3 text-xl font-semibold leading-snug text-[var(--foreground)] sm:text-2xl"
            >
              {question.text}
            </motion.h1>
          </AnimatePresence>
        </header>

        {typeof idx === "number" && idx >= 0 && idx < question.options.length ? (
          <section className="mb-8 rounded-2xl border-2 border-emerald-600/50 bg-emerald-500/10 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              Răspuns corect
            </p>
            <p className="mt-2 text-lg font-bold text-[var(--foreground)]">
              {idx + 1}. {question.options[idx]}
            </p>
          </section>
        ) : (
          <p className="mb-8 text-center text-sm text-[var(--foreground)]/55">
            Se încarcă răspunsul corect…
          </p>
        )}

        <section className="mb-8 rounded-2xl border border-[var(--foreground)]/12 bg-[var(--background)] p-4 sm:p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Leaderboard (Top 5)
            </p>
            <p className="text-xs text-[var(--foreground)]/55">intermediar</p>
          </div>

          {leaderTop.length === 0 ? (
            <p className="text-sm text-[var(--foreground)]/55">
              Se încarcă clasamentul…
            </p>
          ) : (
            <ul className="space-y-2">
              {leaderTop.map((p, i) => (
                <li
                  key={p.id}
                  className="rounded-xl bg-[var(--foreground)]/5 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <span className="w-7 tabular-nums text-[var(--foreground)]/45">
                        {i + 1}.
                      </span>
                      <span className="truncate font-medium text-[var(--foreground)]">
                        {p.display_name}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-bold tabular-nums text-amber-300">
                      {p.score}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--foreground)]/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.max(6, Math.round((p.score / maxScore) * 100))}%`,
                      }}
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-300"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {roundBreakdown != null && (
          <div className="mb-8 space-y-3 rounded-2xl border border-[var(--foreground)]/12 bg-[var(--background)] p-4 sm:p-5">
            <p className="text-center text-sm font-medium text-[var(--foreground)]">
              <span className="tabular-nums">{roundBreakdown.answered}</span> din{" "}
              <span className="tabular-nums">{roundBreakdown.playersTotal}</span>{" "}
              participanți au răspuns
            </p>
            <p className="text-center text-sm text-[var(--foreground)]/75">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {roundBreakdown.correct}
              </span>{" "}
              corecte ·{" "}
              <span className="font-semibold text-red-600 dark:text-red-400">
                {roundBreakdown.answered - roundBreakdown.correct}
              </span>{" "}
              greșite
              {roundBreakdown.playersTotal > roundBreakdown.answered ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-[var(--foreground)]/80">
                    {roundBreakdown.playersTotal - roundBreakdown.answered}
                  </span>{" "}
                  fără răspuns
                </>
              ) : null}
            </p>
            <ul className="mt-4 space-y-2 border-t border-[var(--foreground)]/10 pt-4 text-sm">
              {question.options.map((opt, i) => (
                <li
                  key={i}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                    typeof idx === "number" && i === idx
                      ? "bg-emerald-500/15 font-medium"
                      : "bg-[var(--foreground)]/5"
                  }`}
                >
                  <span className="text-left">
                    {i + 1}. {opt}
                    {typeof idx === "number" && i === idx ? " ✓" : ""}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--foreground)]/70">
                    {roundBreakdown.perOption[i]} voturi
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {roundBreakdown == null && (
          <p className="mb-8 text-center text-sm text-[var(--foreground)]/55">
            Se încarcă statisticile…
          </p>
        )}

        {actionErr != null && (
          <p className="mb-4 text-center text-sm text-red-600 dark:text-red-400">
            {actionErr}
          </p>
        )}

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleProceed}
            className="min-h-12 w-full max-w-sm rounded-xl bg-[var(--foreground)] px-8 font-bold uppercase tracking-wide text-[var(--background)] disabled:opacity-50 sm:w-auto"
          >
            {busy
              ? "…"
              : isLastRound
                ? "Încheie jocul"
                : "Următoarea întrebare"}
          </button>
          {isLastRound && (
            <p className="max-w-sm text-center text-xs text-[var(--foreground)]/50">
              După apăsare, sesiunea se închide și participanții văd
              ecranul final.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === "question_active" && question == null) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-[var(--foreground)]/70">Întrebare indisponibilă.</p>
      </div>
    );
  }

  if (status === "question_active" && showIntermission && sessionId) {
    const maxScore = Math.max(1, ...leaderTop.map((p) => p.score));
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-black px-4 py-10 text-white">
        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mb-6 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
              Leaderboard
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Pregătește-te…
            </h2>
          </motion.div>

          <motion.ul layout className="space-y-2">
            {leaderTop.slice(0, 5).map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="w-7 tabular-nums text-white/55">
                      {i + 1}.
                    </span>
                    <span className="truncate font-semibold text-white/95">
                      {p.display_name}
                    </span>
                  </span>
                  <span className="font-mono text-sm font-black tabular-nums text-amber-200">
                    {p.score}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    layout
                    animate={{
                      width: `${Math.max(
                        8,
                        Math.round((p.score / maxScore) * 100),
                      )}%`,
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 28 }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-300"
                  />
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    );
  }

  return (
    <div
      onPointerDown={audio.unlocked ? undefined : audio.unlock}
      className="mx-auto min-h-dvh max-w-2xl px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      <button
        type="button"
        onClick={() => {
          if (!audio.unlocked) audio.unlock();
          audio.toggleMuted();
        }}
        className="fixed right-3 top-3 z-50 rounded-full border border-[var(--foreground)]/15 bg-[var(--background)]/80 px-4 py-2 text-xs font-semibold text-[var(--foreground)] shadow-sm backdrop-blur"
      >
        {audio.muted ? "Unmute" : "Mute"}
      </button>
      <details className="mb-5 rounded-2xl border border-[var(--foreground)]/12 bg-[var(--background)] p-4">
        <summary className="cursor-pointer select-none text-sm font-semibold text-[var(--foreground)]">
          Debug sesiune
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[var(--foreground)]/80 sm:grid-cols-2">
          <div className="rounded-lg bg-[var(--foreground)]/5 p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/55">
              PIN
            </p>
            <p className="mt-1 font-mono tabular-nums">{normalizedPin}</p>
          </div>
          <div className="rounded-lg bg-[var(--foreground)]/5 p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/55">
              Session ID
            </p>
            <p className="mt-1 break-all font-mono">{sessionId ?? "—"}</p>
          </div>
          <div className="rounded-lg bg-[var(--foreground)]/5 p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/55">
              Quiz
            </p>
            <p className="mt-1 font-medium">{quizTitle ?? "—"}</p>
          </div>
          <div className="rounded-lg bg-[var(--foreground)]/5 p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/55">
              Setări
            </p>
            <p className="mt-1">
              limită:{" "}
              <span className="font-medium tabular-nums">
                {sessionQuestionLimit ?? "toate"}
              </span>
              {" · "}
              random:{" "}
              <span className="font-medium">
                {randomizeQuestions ? "da" : "nu"}
              </span>
              {" · "}
              seed:{" "}
              <span className="font-mono tabular-nums">
                {sessionSeed ?? "—"}
              </span>
            </p>
          </div>
          <div className="rounded-lg bg-[var(--foreground)]/5 p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/55">
              Stare
            </p>
            <p className="mt-1">
              {status} · Q{" "}
              <span className="tabular-nums">{questionIndex + 1}</span>/
              <span className="tabular-nums">{quizLen || "—"}</span>
            </p>
            <p className="mt-1 text-xs text-[var(--foreground)]/60">
              created: {createdAt ?? "—"}
              <br />
              started: {startedAt ?? "—"}
              <br />
              q_started: {questionStartedAt ?? "—"}
            </p>
          </div>
          <div className="rounded-lg bg-[var(--foreground)]/5 p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/55">
              Participanți / răspunsuri
            </p>
            <p className="mt-1">
              participanți: <span className="tabular-nums">{playersCount}</span>
              {" · "}
              răspunsuri: <span className="tabular-nums">{responseCount}</span>
            </p>
          </div>
        </div>
      </details>

      <AnimatePresence mode="wait">
        <motion.div
          key={`qa-q-${questionIndex}-${question?.id ?? "none"}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--foreground)]/60">
              Întrebarea {questionIndex + 1} / {quizLen}
            </span>
            <span className="rounded-full bg-[var(--foreground)]/10 px-4 py-1.5 font-mono text-xl tabular-nums text-[var(--foreground)]">
              {timeLeft != null ? timeLeft : "—"}s
            </span>
          </header>

          <article className="rounded-2xl border border-[var(--foreground)]/12 bg-[var(--background)] p-6 shadow-sm sm:p-8">
            <h1 className="text-xl font-semibold leading-snug text-[var(--foreground)] sm:text-2xl">
              {question!.text}
            </h1>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {question!.options.map((opt, i) => {
                const tone =
                  i === 0
                    ? "bg-red-500 text-white"
                    : i === 1
                      ? "bg-blue-600 text-white"
                      : i === 2
                        ? "bg-amber-400 text-zinc-900"
                        : "bg-emerald-600 text-white";
                return (
                  <div
                    key={i}
                    className={`relative overflow-hidden rounded-2xl p-4 shadow-sm ${tone}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-black uppercase tracking-wider opacity-90">
                        &nbsp;
                      </span>
                      <span className="rounded-full bg-black/10 px-3 py-1 font-mono text-sm font-black tabular-nums">
                        {i + 1}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-snug opacity-95">
                      {opt}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>

          <section className="mt-6 rounded-2xl border border-[var(--foreground)]/12 bg-[var(--background)] p-4 sm:p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Voturi live
              </p>
              <p className="text-xs text-[var(--foreground)]/55">
                {responseCount}/{playersCount}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {OPTION_TONES.map((t, i) => {
                const max = Math.max(1, ...liveVotes);
                const pct = Math.round((liveVotes[i]! / max) * 100);
                const shouldPulse = timeUp && correctIdx === i;
                return (
                  <div key={t.label} className="flex flex-col items-center gap-2">
                    <div className="grid h-28 w-full place-items-end overflow-hidden rounded-2xl bg-[var(--foreground)]/10 p-2">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(6, pct)}%` }}
                        transition={{ type: "spring", stiffness: 260, damping: 28 }}
                        className={`w-full rounded-xl bg-gradient-to-t ${t.bar} ${
                          shouldPulse ? "shadow-[0_0_0_2px_rgba(255,255,255,0.35)_inset]" : ""
                        }`}
                      >
                        {shouldPulse ? (
                          <motion.div
                            aria-hidden
                            initial={{ opacity: 0.35 }}
                            animate={{ opacity: [0.35, 0.9, 0.35] }}
                            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                            className="h-full w-full rounded-xl"
                          />
                        ) : null}
                      </motion.div>
                    </div>
                    <div className="text-center text-xs text-[var(--foreground)]/70">
                      <div className="font-semibold">{t.label}</div>
                      <div className="font-mono tabular-nums">{liveVotes[i]}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <footer className="mt-8 flex flex-col gap-4">
            <p className="text-center text-base font-medium text-[var(--foreground)]">
              {responseCount} din {playersCount} participanți au răspuns
            </p>
            {actionErr != null && (
              <p className="text-center text-sm text-red-600 dark:text-red-400">
                {actionErr}
              </p>
            )}
            <button
              type="button"
              disabled={!canShowResults || busy}
              onClick={handleShowResults}
              className="min-h-12 rounded-xl bg-[var(--foreground)] px-8 font-bold uppercase tracking-wide text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {busy ? "…" : "Afișează rezultatele"}
            </button>
          </footer>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
