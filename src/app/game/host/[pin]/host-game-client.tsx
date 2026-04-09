"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import {
  proceedAfterResults,
  getHostCorrectOptionIndex,
  quitGameSession,
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
  const [quitBusy, setQuitBusy] = useState(false);
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

  const refreshTop10 = useCallback(
    async (sid: string) => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("players")
        .select("id, display_name, score")
        .eq("session_id", sid)
        .order("score", { ascending: false })
        .limit(10);
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
    if (status !== "question_active") {
      return;
    }
    // Rundă deja „live” în DB (refresh, Realtime) — fără încă o intermisie de 10s.
    if (questionStartedAt != null) {
      prevQuestionIdxRef.current = questionIndex;
      setShowIntermission((show) => (show ? false : show));
      return;
    }
    if (prevQuestionIdxRef.current !== questionIndex) {
      prevQuestionIdxRef.current = questionIndex;
      if (sessionId) {
        void refreshTop10(sessionId);
      }
      setShowIntermission(true);
      const id = window.setTimeout(() => {
        setShowIntermission(false);
        void (async () => {
          const sid = sessionIdRef.current;
          if (!sid) return;
          setActionErr(null);
          const res = await startCurrentQuestionTimer(sid);
          if (res.ok) {
            setQuestionStartedAt(res.startedAt);
          } else {
            setActionErr(res.error);
          }
        })();
      }, 7_000);
      return () => window.clearTimeout(id);
    }
  }, [status, questionIndex, sessionId, questionStartedAt, refreshTop10]);

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
      await refreshTop10(sid);
    }
  }, [normalizedPin, refreshResponseCount, refreshLiveVotes, refreshTop10]);

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
          .limit(10),
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
            void refreshTop10(sessionId);
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
          void refreshTop10(sessionId);
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
          void (async () => {
            setActionErr(null);
            const res = await startCurrentQuestionTimer(sessionId);
            if (res.ok) {
              setQuestionStartedAt(res.startedAt);
            } else {
              setActionErr(res.error);
            }
          })();
        }, 7_000);
      }
    } finally {
      setBusy(false);
    }
  }, [sessionId, status]);

  const handleQuitGame = useCallback(async () => {
    if (!sessionId) return;
    if (
      !window.confirm(
        "Închizi jocul pentru toți participanții? Ei vor vedea clasamentul curent.",
      )
    ) {
      return;
    }
    setQuitBusy(true);
    setActionErr(null);
    try {
      const res = await quitGameSession(sessionId);
      if (!res.ok) {
        setActionErr(res.error);
        return;
      }
      stopTimer();
      router.push("/host");
    } finally {
      setQuitBusy(false);
    }
  }, [sessionId, router, stopTimer]);

  if (!sessionId && status === "lobby") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-gray-400">
        <p>Se încarcă sesiunea…</p>
      </div>
    );
  }

  if (status === "lobby") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-6 text-center text-gray-100">
        <p className="text-lg text-gray-400">
          Jocul n-a pornit încă. Dă-i start din pagina de Admin.
        </p>
        <p className="text-3xl font-extrabold tabular-nums tracking-widest text-[#f59e0b]">
          {normalizedPin}
        </p>
        <Link
          href="/host"
          className="font-semibold text-[#f59e0b] underline-offset-4 hover:underline"
        >
          La Admin
        </Link>
      </div>
    );
  }

  if (status === "finished") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-8 px-6 text-center text-gray-100">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#f59e0b]">
          Joc terminat
        </h1>
        <Link
          href={`/game/results/${encodeURIComponent(normalizedPin)}`}
          className="min-h-12 rounded-2xl bg-[#f59e0b] px-8 py-3 font-bold text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Vezi clasamentul
        </Link>
        <Link
          href="/host"
          className="font-semibold text-gray-400 underline-offset-4 hover:text-[#f59e0b] hover:underline"
        >
          Înapoi la Admin
        </Link>
      </div>
    );
  }

  if (status === "showing_results" && question == null) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-gray-400">
        <p>Date indisponibile.</p>
      </div>
    );
  }

  if (status === "showing_results" && question != null) {
    const isLastRound = questionIndex >= quizLen - 1;
    const idx = correctIdx;
    const maxScore = Math.max(1, ...leaderTop.map((p) => p.score));

    return (
      <div className="mx-auto min-h-dvh w-full max-w-3xl px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-gray-100">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleQuitGame}
            disabled={quitBusy || !sessionId}
            className="rounded-2xl border border-red-500/45 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-45"
          >
            {quitBusy ? "…" : "Termină jocul!"}
          </button>
        </div>
        <header className="mb-8 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Rezultate rundă
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Întrebarea {questionIndex + 1} din {quizLen}
            {isLastRound ? " · ultima întrebare" : ""}
          </p>
          <AnimatePresence mode="wait">
            <motion.h1
              key={`sr-q-${questionIndex}-${question.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mt-4 text-xl font-extrabold leading-snug tracking-tight text-gray-100 sm:text-2xl"
            >
              {question.text}
            </motion.h1>
          </AnimatePresence>
        </header>

        {typeof idx === "number" && idx >= 0 && idx < question.options.length ? (
          <section className="mb-8 w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-300/90">
              Răspuns corect
            </p>
            <p className="mt-3 text-lg font-extrabold text-gray-100">
              {idx + 1}. {question.options[idx]}
            </p>
          </section>
        ) : (
          <p className="mb-8 text-center text-sm text-gray-400">
            Se încarcă răspunsul corect…
          </p>
        )}

        <div className="mb-8 flex w-full flex-col items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={handleProceed}
            className="min-h-14 w-full max-w-sm rounded-2xl bg-[#f59e0b] px-8 font-extrabold uppercase tracking-wide text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 sm:w-auto"
          >
            {busy
              ? "…"
              : isLastRound
                ? "Încheie jocul"
                : "Următoarea întrebare"}
          </button>
          {isLastRound && (
            <p className="max-w-sm text-center text-xs text-gray-400">
              După apăsare, sesiunea se închide și participanții văd
              ecranul final.
            </p>
          )}
        </div>

        <section className="mb-8 w-full rounded-2xl border border-gray-700/50 bg-[#1a2236] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-8">
          <div className="mb-6 flex items-baseline justify-between gap-3">
            <p className="text-sm font-extrabold text-gray-100">
              Clasament (Top 10)
            </p>
            <p className="pr-1 text-xs font-semibold uppercase tracking-wider text-[#f59e0b]">
              intermediar
            </p>
          </div>

          {leaderTop.length === 0 ? (
            <p className="text-sm text-gray-400">
              Se încarcă clasamentul…
            </p>
          ) : (
            <ul className="space-y-4">
              {leaderTop.map((p, i) => (
                <li
                  key={p.id}
                  className="rounded-2xl border border-gray-700/40 bg-[#0a0f1e] p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex w-8 shrink-0 items-center justify-center tabular-nums text-sm font-bold text-gray-400">
                        {i === 0 ? <span aria-hidden>👑</span> : `${i + 1}.`}
                      </span>
                      <span className="truncate font-semibold text-gray-100">
                        {p.display_name}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-extrabold tabular-nums text-[#f59e0b]">
                      {p.score}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1a2236]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.max(6, Math.round((p.score / maxScore) * 100))}%`,
                      }}
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {roundBreakdown != null && (
          <div className="mb-8 w-full space-y-4 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-8">
            <p className="text-center text-sm font-medium text-gray-100">
              <span className="tabular-nums font-extrabold text-[#f59e0b]">{roundBreakdown.answered}</span> din{" "}
              <span className="tabular-nums">{roundBreakdown.playersTotal}</span>{" "}
              participanți au răspuns
            </p>
            <p className="text-center text-sm text-gray-400">
              <span className="font-semibold text-emerald-400">
                {roundBreakdown.correct}
              </span>{" "}
              corecte ·{" "}
              <span className="font-semibold text-red-400">
                {roundBreakdown.answered - roundBreakdown.correct}
              </span>{" "}
              greșite
              {roundBreakdown.playersTotal > roundBreakdown.answered ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-gray-300">
                    {roundBreakdown.playersTotal - roundBreakdown.answered}
                  </span>{" "}
                  fără răspuns
                </>
              ) : null}
            </p>
            <ul className="mt-4 space-y-3 border-t border-gray-700/50 pt-6 text-sm">
              {question.options.map((opt, i) => (
                <li
                  key={i}
                  className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
                    typeof idx === "number" && i === idx
                      ? "border border-emerald-500/35 bg-emerald-500/10 font-semibold"
                      : "border border-gray-700/40 bg-[#0a0f1e]"
                  }`}
                >
                  <span className="text-left text-gray-100">
                    {i + 1}. {opt}
                    {typeof idx === "number" && i === idx ? " ✓" : ""}
                  </span>
                  <span className="shrink-0 tabular-nums text-gray-400">
                    {roundBreakdown.perOption[i]} voturi
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {roundBreakdown == null && (
          <p className="mb-8 text-center text-sm text-gray-400">
            Se încarcă statisticile…
          </p>
        )}

        {actionErr != null && (
          <p className="mb-4 text-center text-sm text-red-400">
            {actionErr}
          </p>
        )}
      </div>
    );
  }

  if (status === "question_active" && question == null) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-gray-400">
        <p>Întrebare indisponibilă.</p>
      </div>
    );
  }

  if (status === "question_active" && showIntermission && sessionId) {
    const maxScore = Math.max(1, ...leaderTop.map((p) => p.score));
    return (
      <div className="flex min-h-dvh flex-col bg-[#0a0f1e] px-6 py-6 text-gray-100">
        <div className="shrink-0 pb-4">
          <button
            type="button"
            onClick={handleQuitGame}
            disabled={quitBusy || !sessionId}
            className="rounded-2xl border border-red-500/45 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-45"
          >
            {quitBusy ? "…" : "Termină jocul!"}
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-4">
        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mb-8 text-center"
          >
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#f59e0b] sm:text-3xl">
              Pregătește-te…
            </h2>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Clasament
            </p>
          </motion.div>

          <motion.ul layout className="space-y-4">
            {leaderTop.slice(0, 10).map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="rounded-2xl border border-gray-700/50 bg-[#1a2236] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex w-8 shrink-0 items-center justify-center tabular-nums text-sm font-bold text-gray-400">
                      {i === 0 ? <span aria-hidden>👑</span> : `${i + 1}.`}
                    </span>
                    <span className="truncate font-semibold text-gray-100">
                      {p.display_name}
                    </span>
                  </span>
                  <span className="font-mono text-sm font-extrabold tabular-nums text-[#f59e0b]">
                    {p.score}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#0a0f1e]">
                  <motion.div
                    layout
                    animate={{
                      width: `${Math.max(
                        8,
                        Math.round((p.score / maxScore) * 100),
                      )}%`,
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 28 }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                  />
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onPointerDown={audio.unlocked ? undefined : audio.unlock}
      className="mx-auto min-h-dvh w-full max-w-3xl px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-gray-100"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleQuitGame}
            disabled={quitBusy || !sessionId}
            className="rounded-2xl border border-red-500/45 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-45"
          >
            {quitBusy ? "…" : "Termină jocul!"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!audio.unlocked) audio.unlock();
            audio.toggleMuted();
          }}
          className="rounded-2xl border border-gray-700/50 bg-[#1a2236] px-4 py-2 text-xs font-semibold text-[#f59e0b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {audio.muted ? "Unmute" : "Mute"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`qa-q-${questionIndex}-${question?.id ?? "none"}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          <article className="rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-10">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-gray-400">
                Întrebarea {questionIndex + 1} / {quizLen}
              </p>
              <span className="rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-4 py-2 font-mono text-sm font-extrabold tabular-nums text-[#f59e0b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
                {timeLeft != null ? timeLeft : "—"}s
              </span>
            </div>
            <h1 className="mt-4 text-left text-xl font-extrabold leading-snug tracking-tight text-gray-100 sm:text-2xl">
              {question!.text}
            </h1>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {question!.options.map((opt, i) => {
                const tone =
                  i === 0
                    ? "bg-red-500 text-white shadow-[inset_0_2px_0_0_rgba(255,255,255,0.22)]"
                    : i === 1
                      ? "bg-blue-600 text-white shadow-[inset_0_2px_0_0_rgba(255,255,255,0.2)]"
                      : i === 2
                        ? "bg-amber-400 text-zinc-900 shadow-[inset_0_2px_0_0_rgba(255,255,255,0.35)]"
                        : "bg-emerald-600 text-white shadow-[inset_0_2px_0_0_rgba(255,255,255,0.18)]";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.05 }}
                    className={`relative overflow-hidden rounded-2xl p-5 ${tone}`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-black uppercase tracking-wider opacity-90">
                        &nbsp;
                      </span>
                      <span className="rounded-full bg-black/15 px-3 py-1 font-mono text-sm font-black tabular-nums">
                        {i + 1}
                      </span>
                    </div>
                    <p className="text-sm font-bold leading-snug opacity-95">
                      {opt}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </article>

          <footer className="mt-8 flex flex-col gap-6">
            <p className="text-center text-base font-medium text-gray-100">
              <span className="font-extrabold text-[#f59e0b]">{responseCount}</span>{" "}
              din {playersCount} participanți au răspuns
            </p>
            {actionErr != null && (
              <p className="text-center text-sm text-red-400">
                {actionErr}
              </p>
            )}
            <button
              type="button"
              disabled={!canShowResults || busy}
              onClick={handleShowResults}
              className="min-h-14 rounded-2xl bg-[#f59e0b] px-8 font-extrabold uppercase tracking-wide text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100"
            >
              {busy ? "…" : "Afișează rezultatele"}
            </button>
          </footer>

          <section className="mt-8 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-8">
            <div className="mb-6 flex items-baseline justify-between gap-3">
              <p className="text-sm font-extrabold text-gray-100">
                Voturi live
              </p>
              <p className="text-xs font-semibold text-[#f59e0b]">
                {responseCount}/{playersCount}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {OPTION_TONES.map((t, i) => {
                const max = Math.max(1, ...liveVotes);
                const pct = Math.round((liveVotes[i]! / max) * 100);
                const shouldPulse = timeUp && correctIdx === i;
                return (
                  <div key={t.label} className="flex flex-col items-center gap-2">
                    <div className="grid h-28 w-full place-items-end overflow-hidden rounded-2xl border border-gray-700/40 bg-[#0a0f1e] p-2 shadow-inner">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(6, pct)}%` }}
                        transition={{ type: "spring", stiffness: 260, damping: 28 }}
                        className={`w-full rounded-xl bg-gradient-to-t ${t.bar} ${
                          shouldPulse ? "shadow-[0_0_0_2px_rgba(245,158,11,0.5)_inset]" : ""
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
                    <div className="text-center text-xs text-gray-400">
                      <div className="font-semibold text-gray-300">{t.label}</div>
                      <div className="font-mono tabular-nums text-[#f59e0b]">{liveVotes[i]}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
