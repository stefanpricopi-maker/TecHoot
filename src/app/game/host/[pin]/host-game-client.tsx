"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import {
  proceedAfterResults,
  getHostCorrectOptionIndex,
  getHardestQuestionAdmin,
  publishFinalResults,
  quitGameSession,
  skipCurrentQuestion,
  showRoundResults,
  startCurrentQuestionTimer,
} from "@/app/actions/game-actions";
import { LiveReactionsOverlay, type LiveReactionBurst } from "./live-reactions-overlay";
import type { PublicQuizQuestionData } from "@/lib/quiz-db";
import { fetchOrderedQuizQuestionsPublic } from "@/lib/quiz-db";
import { hashStringToSeed, seededShuffle } from "@/lib/seeded-shuffle";
import {
  createGamePartySocket,
  messageDataToString,
  safeParseLiveReactionFromString,
} from "@/lib/partykit";
import { createSupabaseClient } from "@/lib/supabase";
import { useGameAudio } from "@/hooks/useGameAudio";
import type { GameSession } from "@/types/game";

type PlayStatus = GameSession["status"];

type HostGameClientProps = {
  normalizedPin: string;
};

function questionTextSizeClass(text: string): string {
  const len = text.trim().length;
  if (len >= 240) return "text-lg sm:text-xl";
  if (len >= 170) return "text-xl sm:text-2xl";
  return "text-xl sm:text-2xl";
}

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
      // Avoid synchronous setState in effects (eslint rule); defer one tick.
      Promise.resolve().then(() => setDisplay(to));
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

function LeaderboardBarChart({
  rows,
  maxBars = 5,
}: {
  rows: { id: string; display_name: string; score: number; correct_streak?: number }[];
  maxBars?: number;
}) {
  const top = rows.slice(0, maxBars);
  const max = Math.max(1, ...top.map((r) => Number(r.score ?? 0)));
  return (
    <div className="space-y-3">
      {top.map((r, i) => {
        const score = Number(r.score ?? 0);
        const pct = Math.max(0, Math.min(1, score / max));
        return (
          <div
            key={r.id}
            className="rounded-2xl border border-gray-700/50 bg-[#1a2236] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex w-10 shrink-0 items-center justify-center tabular-nums text-sm font-extrabold text-gray-300">
                  {i === 0 ? <span aria-hidden>👑</span> : `${i + 1}.`}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-extrabold tracking-tight text-gray-100">
                    {r.display_name}
                  </span>
                  {(() => {
                    const s = Math.floor(Number(r.correct_streak ?? 0));
                    const isOnFire = s === 3 || s === 5 || s >= 10;
                    if (!isOnFire) return null;
                    const label = s >= 10 ? "On Fire x10+" : `On Fire x${s}`;
                    return (
                      <motion.span
                        key={`fire-${r.id}-${s}`}
                        initial={{ opacity: 0, scale: 0.9, y: -2 }}
                        animate={{ opacity: 1, scale: [1, 1.06, 1], y: 0 }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          repeatType: "mirror",
                          ease: "easeInOut",
                        }}
                        className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-extrabold text-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.25)_inset]"
                        aria-label={label}
                        title={label}
                      >
                        🔥
                      </motion.span>
                    );
                  })()}
                </span>
              </span>
              <span className="font-mono text-sm font-extrabold tabular-nums text-[#f59e0b]">
                <AnimatedScore value={score} durationMs={900} />
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(pct * 100)}%` }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-amber-200"
              />
            </div>
          </div>
        );
      })}
      {top.length === 0 ? (
        <div className="rounded-2xl border border-gray-700/40 bg-[#0a0f1e] px-6 py-10 text-center text-sm text-gray-400">
          Încă nu există scoruri.
        </div>
      ) : null}
    </div>
  );
}

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
  const isHurry =
    status === "question_active" && timeLeft != null && Number(timeLeft) <= 5;

  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quitBusy, setQuitBusy] = useState(false);
  const [skipBusy, setSkipBusy] = useState(false);
  const [questions, setQuestions] = useState<PublicQuizQuestionData[] | null>(null);
  const [correctIdx, setCorrectIdx] = useState<number | null>(null);
  const [correctIndices, setCorrectIndices] = useState<number[] | null>(null);
  const [correctType, setCorrectType] = useState<
    "single" | "true_false" | "multi_select" | null
  >(null);
  const [hardest, setHardest] = useState<{
    questionIndex: number;
    prompt: string;
    correct: number;
    wrong: number;
    answered: number;
    correctPct: number;
  } | null>(null);

  /** Rezumat după „Afișează rezultatele” (încărcat din DB). */
  const [roundBreakdown, setRoundBreakdown] = useState<{
    answered: number;
    correct: number;
    playersTotal: number;
    perOption: [number, number, number, number];
  } | null>(null);

  const [leaderTop, setLeaderTop] = useState<
    { id: string; display_name: string; score: number; correct_streak?: number }[]
  >([]);
  const [teamMode, setTeamMode] = useState(false);
  const [teamTop, setTeamTop] = useState<
    { teamId: string; name: string; score: number; members: number }[]
  >([]);
  const prevLeaderRanksRef = useRef<Record<string, number>>({});
  const [leaderMove, setLeaderMove] = useState<
    Record<string, "up" | "down" | "same" | "new">
  >({});
  const [leaderLayoutReady, setLeaderLayoutReady] = useState(false);

  type LeaderTopRow = {
    id: string;
    display_name: string | null;
    score: number;
    team_id?: string | null;
    teams?: { name?: string | null } | null;
    correct_streak?: number | null;
  };

  const [showIntermission, setShowIntermission] = useState(false);
  const [intermissionLeft, setIntermissionLeft] = useState<number | null>(null);
  const [intermissionGo, setIntermissionGo] = useState(false);
  const [intermissionPhase, setIntermissionPhase] = useState<
    "idle" | "base_loaded" | "final_loaded"
  >("idle");
  const [missingTeamCount, setMissingTeamCount] = useState<number | null>(null);

  const [liveVotes, setLiveVotes] = useState<[number, number, number, number]>([
    0, 0, 0, 0,
  ]);

  const [reactionBursts, setReactionBursts] = useState<LiveReactionBurst[]>([]);
  const reactionCountRef = useRef(0);

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

  const teamModeRef = useRef<boolean>(false);
  teamModeRef.current = teamMode;

  const intermissionStartAttemptRef = useRef(false);

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
        .select("id, display_name, score, correct_streak, team_id, teams(name)")
        .eq("session_id", sid)
        .order("score", { ascending: false })
        .limit(10);
      const rows = (data ?? []) as unknown as LeaderTopRow[];
      setLeaderTop(
        rows.map((p) => ({
          id: p.id,
          display_name: p.display_name ?? "—",
          score: p.score ?? 0,
          correct_streak:
            typeof p.correct_streak === "number" && Number.isFinite(p.correct_streak)
              ? Math.max(0, Math.floor(p.correct_streak))
              : 0,
          team_id: (p as any).team_id ?? null,
          teams: (p as any).teams ?? null,
        })),
      );
    },
    [],
  );

  const refreshTeamTop = useCallback(async (sid: string) => {
    const supabase = createSupabaseClient();
    const { data } = await supabase
      .from("players")
      .select("team_id, score, teams(name)")
      .eq("session_id", sid);
    const rows = (data ?? []) as Array<{
      team_id: string | null;
      score: number | null;
      teams?: { name?: string | null } | null;
    }>;
    const agg = new Map<
      string,
      { teamId: string; name: string; score: number; members: number }
    >();
    for (const r of rows) {
      const tid = r.team_id;
      if (!tid) continue;
      const cur = agg.get(tid) ?? {
        teamId: tid,
        name: String(r.teams?.name ?? "Echipă"),
        score: 0,
        members: 0,
      };
      cur.score += Number(r.score ?? 0);
      cur.members += 1;
      agg.set(tid, cur);
    }
    const list = Array.from(agg.values());
    list.sort((a, b) => b.score - a.score);
    setTeamTop(list);
  }, []);

  const refreshTop10BaseBeforeLastRound = useCallback(
    async (sid: string, prevQuestionIdx: number) => {
      const supabase = createSupabaseClient();
      const [playersRes, respRes] = await Promise.all([
        supabase
          .from("players")
          .select("id, display_name, score, correct_streak, joined_at")
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
        correct_streak?: number | null;
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
          correct_streak:
            typeof p.correct_streak === "number" && Number.isFinite(p.correct_streak)
              ? Math.max(0, Math.floor(p.correct_streak))
              : 0,
          joined_at: p.joined_at,
        };
      });

      adjusted.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
      });

      setLeaderTop(
        adjusted
          .slice(0, 10)
          .map((p) => ({
            id: p.id,
            display_name: p.display_name,
            score: p.score,
            correct_streak: p.correct_streak,
          })),
      );
      if (teamModeRef.current) {
        await refreshTeamTop(sid);
      }
      setIntermissionPhase("base_loaded");
    },
    [refreshTeamTop],
  );

  const prevQuestionIdxRef = useRef<number | null>(null);
  useEffect(() => {
    if (status !== "question_active") {
      return;
    }
    // Rundă deja „live” în DB (refresh, Realtime) — fără încă o intermisie de 10s.
    if (questionStartedAt != null) {
      prevQuestionIdxRef.current = questionIndex;
      setShowIntermission(false);
      return;
    }
    if (prevQuestionIdxRef.current !== questionIndex) {
      prevQuestionIdxRef.current = questionIndex;
      if (sessionId) {
        // Phase 1: show base scores (pre last-round points), then Phase 2 updates after intro animation.
        void refreshTop10BaseBeforeLastRound(sessionId, Math.max(0, questionIndex - 1));
      }
      setShowIntermission(true);
      setIntermissionGo(false);
      setIntermissionLeft(3);
      // Timer start is handled by the intermission gating effect (team mode safe).
      return;
    }
  }, [status, questionIndex, sessionId, questionStartedAt, refreshTop10BaseBeforeLastRound]);

  useEffect(() => {
  }, [leaderTop, status, showIntermission, questionIndex]);

  useEffect(() => {
    if (!showIntermission) {
      setIntermissionLeft(null);
      setIntermissionGo(false);
      setMissingTeamCount(null);
      intermissionStartAttemptRef.current = false;
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
  }, [showIntermission]);

  // Team mode gate UX: track how many players still need a team.
  useEffect(() => {
    if (!teamMode || !sessionId || status !== "question_active" || !showIntermission) {
      setMissingTeamCount(null);
      return;
    }
    const supabase = createSupabaseClient();
    let cancelled = false;
    const tick = async () => {
      const { count, error } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .is("team_id", null);
      if (cancelled) return;
      if (!error) {
        setMissingTeamCount(count ?? 0);
      }
    };
    void tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [teamMode, sessionId, status, showIntermission]);

  // Only start timer when countdown ended AND (in team mode) everyone picked a team.
  useEffect(() => {
    if (!sessionId) return;
    if (status !== "question_active") return;
    if (!showIntermission) return;
    if (questionStartedAt != null) return;
    if (intermissionLeft !== 0) return;
    if (teamMode) {
      // Gate by team selection.
      if (missingTeamCount == null) return;
      if (missingTeamCount > 0) return;
      // First question is started manually by Admin (from /admin).
      if (!startedAt) return;
    }
    if (intermissionStartAttemptRef.current) return;
    intermissionStartAttemptRef.current = true;

    void (async () => {
      setActionErr(null);
      const res = await startCurrentQuestionTimer(sessionId);
      if (res.ok) {
        setQuestionStartedAt(res.startedAt);
        setShowIntermission(false);
        setIntermissionGo(false);
        setIntermissionLeft(null);
        setIntermissionPhase("idle");
      } else {
        // Allow retries (e.g. team gate or transient errors).
        intermissionStartAttemptRef.current = false;
        setActionErr(res.error);
      }
    })();
  }, [
    sessionId,
    status,
    showIntermission,
    questionStartedAt,
    intermissionLeft,
    teamMode,
    missingTeamCount,
  ]);

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
    if (leaderTop.length === 0) {
      setLeaderLayoutReady(false);
      return;
    }
    if (leaderLayoutReady) return;
    // Phase 1: let rows appear first. Phase 2: enable layout glide.
    const t = window.setTimeout(() => setLeaderLayoutReady(true), 260);
    return () => window.clearTimeout(t);
  }, [leaderTop.length, leaderLayoutReady]);

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
      .select("selected_option_index, selected_option_indices")
      .eq("session_id", sid)
      .eq("question_index", qIdx);
    const per: [number, number, number, number] = [0, 0, 0, 0];
    for (const row of data ?? []) {
      const arr = (row as any).selected_option_indices as unknown;
      if (Array.isArray(arr)) {
        for (const v of arr) {
          const i = typeof v === "number" ? Math.floor(v) : -1;
          if (i >= 0 && i <= 3) per[i] += 1;
        }
        continue;
      }
      const i = (row as any).selected_option_index as number;
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
        "id, current_question_index, status, quiz_id, question_count, question_seed, randomize_questions, current_question_started_at, created_at, started_at, team_mode, quizzes(title)",
      )
      .eq("pin", normalizedPin)
      .maybeSingle();

    if (error || !sess) {
      if (error) {
        setActionErr(
          `${error.message} (probabil lipsește migrația pentru leaderboard breaks)`,
        );
      }
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
    setTeamMode(Boolean((sess as any).team_mode ?? false));
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
      if (Boolean((sess as any).team_mode ?? false)) {
        await refreshTeamTop(sid);
      } else {
        setTeamTop([]);
      }
    }
  }, [normalizedPin, refreshResponseCount, refreshLiveVotes, refreshTop10, refreshTeamTop]);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  // PartyKit: listen for live reactions (purely client-side animation).
  useEffect(() => {
    const connId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `host-${Math.random().toString(16).slice(2)}-${Date.now()}`;
    const ws = createGamePartySocket({ pin: normalizedPin, connectionId: connId });

    const onMessage = async (e: MessageEvent) => {
      const raw = await messageDataToString(e.data);
      if (!raw) return;
      const msg = safeParseLiveReactionFromString(raw);
      if (!msg) return;

      const id = `${msg.ts}-${reactionCountRef.current++}`;
      // Randomized spawn params; keep it cheap & bounded.
      const leftPct = 8 + Math.random() * 84;
      const driftPx = -30 + Math.random() * 60;
      const sizePx = 26 + Math.random() * 22;

      setReactionBursts((prev) => {
        const next = [...prev, { id, emoji: msg.emoji, leftPct, driftPx, sizePx }];
        // Cap active nodes to avoid layout pressure under spam.
        const cap = 80;
        return next.length > cap ? next.slice(next.length - cap) : next;
      });

      window.setTimeout(() => {
        setReactionBursts((prev) => prev.filter((b) => b.id !== id));
      }, 2050);
    };

    ws.addEventListener("message", onMessage);
    return () => {
      ws.removeEventListener("message", onMessage);
      ws.close();
    };
  }, [normalizedPin]);

  useEffect(() => {
    if (status === "finished") {
      if (!sessionId) return;
      void (async () => {
        const res = await getHardestQuestionAdmin(sessionId);
        if (res.ok) {
          setHardest(res.hardest);
        }
      })();
    }
  }, [status, sessionId]);

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
      setTeamTop([]);
      setCorrectIdx(null);
      setCorrectIndices(null);
      setCorrectType(null);
      return;
    }

    void (async () => {
      const res = await getHostCorrectOptionIndex(sessionId);
      if (res.ok) {
        setCorrectIdx(res.correctIndex);
        setCorrectIndices(res.correctIndices);
        setCorrectType(res.questionType);
      }
    })();

    const qIdx = questionIndex;

    void (async () => {
      const supabase = createSupabaseClient();
      const [respRes, playersRes, topRes] = await Promise.all([
        supabase
          .from("round_responses")
          .select("selected_option_index, selected_option_indices")
          .eq("session_id", sessionId)
          .eq("question_index", qIdx),
        supabase
          .from("players")
          .select("*", { count: "exact", head: true })
          .eq("session_id", sessionId),
        supabase
          .from("players")
          .select("id, display_name, score, correct_streak, team_id, teams(name)")
          .eq("session_id", sessionId)
          .order("score", { ascending: false })
          .limit(10),
      ]);

      const rows = respRes.data ?? [];
      const perOption: [number, number, number, number] = [0, 0, 0, 0];
      for (const row of rows) {
        const arr = (row as any).selected_option_indices as unknown;
        if (Array.isArray(arr)) {
          for (const v of arr) {
            const i = typeof v === "number" ? Math.floor(v) : -1;
            if (i >= 0 && i <= 3) perOption[i] += 1;
          }
          continue;
        }
        const i = (row as any).selected_option_index as number;
        if (i >= 0 && i <= 3) {
          perOption[i] += 1;
        }
      }

      const t = correctType;
      const idxCorrect = correctIdx;
      const setCorrect = new Set<number>((correctIndices ?? []).map((x) => Math.floor(x)));
      const correct =
        t === "multi_select"
          ? rows.filter((r) => {
              const arr = (r as any).selected_option_indices as unknown;
              if (!Array.isArray(arr)) return false;
              const sel = new Set<number>();
              for (const v of arr) {
                if (typeof v !== "number" || !Number.isFinite(v)) continue;
                sel.add(Math.floor(v));
              }
              if (sel.size !== setCorrect.size) return false;
              for (const c of setCorrect) if (!sel.has(c)) return false;
              return true;
            }).length
          : typeof idxCorrect === "number"
            ? rows.filter(
                (r) => (r as any).selected_option_index === idxCorrect,
              ).length
            : 0;

      setRoundBreakdown({
        answered: rows.length,
        correct,
        playersTotal: playersRes.count ?? 0,
        perOption,
      });

      const topRows = (topRes.data ?? []) as unknown as Array<
        LeaderTopRow & { team_id?: string | null; teams?: { name?: string | null } | null }
      >;
      setLeaderTop(
        topRows.map((p) => ({
          id: p.id,
          display_name: p.display_name ?? "—",
          score: p.score ?? 0,
          correct_streak:
            typeof (p as any).correct_streak === "number" && Number.isFinite((p as any).correct_streak)
              ? Math.max(0, Math.floor((p as any).correct_streak))
              : 0,
        })),
      );

      if (teamMode) {
        const agg = new Map<
          string,
          { teamId: string; name: string; score: number; members: number }
        >();
        for (const p of topRows) {
          const tid = (p as any).team_id as string | null | undefined;
          if (!tid) continue;
          const cur = agg.get(tid) ?? {
            teamId: tid,
            name: String((p as any).teams?.name ?? "Echipă"),
            score: 0,
            members: 0,
          };
          cur.score += Number((p as any).score ?? 0);
          cur.members += 1;
          agg.set(tid, cur);
        }
        const list = Array.from(agg.values()).sort((a, b) => b.score - a.score);
        setTeamTop(list);
      }
    })();
  }, [status, sessionId, questionIndex, question, correctIdx, correctIndices, correctType, teamMode]);

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
          setTeamMode(Boolean((row as any).team_mode ?? false));
          if (row.status === "question_active") {
            void refreshResponseCount(
              sessionId,
              row.current_question_index,
            );
            setLiveVotes([0, 0, 0, 0]);
            void refreshLiveVotes(sessionId, row.current_question_index);
            void refreshTop10(sessionId);
            if (Boolean((row as any).team_mode ?? false)) {
              void refreshTeamTop(sessionId);
            } else {
              setTeamTop([]);
            }
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
          if (teamMode) {
            void refreshTeamTop(sessionId);
          }
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
            selected_option_index: number | null;
            selected_option_indices?: unknown;
          };
          if (row.question_index === questionIndexRef.current) {
            setResponseCount((r) => r + 1);
            const arr = (row as any).selected_option_indices;
            if (Array.isArray(arr)) {
              for (const v of arr) {
                const i = typeof v === "number" ? Math.floor(v) : -1;
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
            } else {
              const i = Number(row.selected_option_index ?? -1);
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
        setIntermissionGo(false);
        setIntermissionLeft(3);
        // Timer start is handled by the intermission gating effect (team mode safe).
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

  const handleSkip = useCallback(async () => {
    if (!sessionId) return;
    setSkipBusy(true);
    setActionErr(null);
    try {
      const res = await skipCurrentQuestion(sessionId);
      if (!res.ok) {
        setActionErr(res.error);
        return;
      }
      setStatus("showing_results");
      stopTimer();
      setTimeLeft(null);
      setTimeUp(true);
    } finally {
      setSkipBusy(false);
    }
  }, [sessionId, stopTimer]);

  if (!sessionId && status === "lobby") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-gray-400">
        <p className="text-center">
          {actionErr ?? "Se încarcă sesiunea…"}
        </p>
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
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-8 px-6 text-center text-gray-100">
        <LiveReactionsOverlay bursts={reactionBursts} />
        <h1 className="text-3xl font-extrabold tracking-tight text-[#f59e0b]">
          Joc terminat
        </h1>
        {hardest && (
          <div className="w-full rounded-2xl border border-white/10 bg-[#1a2236]/55 p-6 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Cea mai grea întrebare
            </p>
            <p className="mt-3 text-sm font-semibold text-gray-100">
              Întrebarea {hardest.questionIndex + 1}
            </p>
            <p className="mt-3 whitespace-pre-wrap break-words text-lg font-extrabold leading-snug text-gray-100">
              {hardest.prompt}
            </p>
            <p className="mt-4 text-sm text-gray-400">
              <span className="font-semibold text-gray-100">
                {hardest.correctPct}% corecte
              </span>{" "}
              · {hardest.correct} corecte · {hardest.wrong} greșite ·{" "}
              {hardest.answered} răspunsuri
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            if (!sessionId) return;
            void (async () => {
              setActionErr(null);
              setBusy(true);
              try {
                const res = await publishFinalResults(sessionId);
                if (!res.ok) {
                  setActionErr(res.error);
                  return;
                }
                router.push(`/game/results/${encodeURIComponent(normalizedPin)}`);
              } finally {
                setBusy(false);
              }
            })();
          }}
          disabled={busy || !sessionId}
          className="min-h-12 rounded-2xl bg-[#f59e0b] px-8 py-3 font-bold text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "…" : "Vezi clasamentul"}
        </button>
        {actionErr && (
          <p className="text-sm text-red-300">
            {actionErr}
          </p>
        )}
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
      <div className="relative mx-auto min-h-dvh w-full max-w-3xl px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-gray-100">
        <LiveReactionsOverlay bursts={reactionBursts} />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleQuitGame}
            disabled={quitBusy || !sessionId}
            className="rounded-2xl border border-red-500/45 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-45"
          >
            {quitBusy ? "…" : "Termină jocul!"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleProceed}
            className="min-h-10 rounded-2xl bg-[#f59e0b] px-5 py-2 text-sm font-extrabold uppercase tracking-wide text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "…" : isLastRound ? "Încheie jocul" : "Clasament"}
          </button>
        </div>
        <header className="mb-8 text-left">
          <div />
        </header>

        {roundBreakdown != null && (
          <div className="mb-8 w-full space-y-4 rounded-2xl border border-gray-700/50 bg-[#1a2236] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-8">
            <p className="text-left text-sm font-semibold text-gray-300">
              Întrebarea {questionIndex + 1} din {quizLen}
              {isLastRound ? " · ultima întrebare" : ""}
            </p>
            <AnimatePresence mode="wait">
              <motion.h1
                key={`sr-q-${questionIndex}-${question.id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="text-left text-xl font-extrabold leading-snug tracking-tight text-gray-100 sm:text-2xl"
              >
                {question.text}
              </motion.h1>
            </AnimatePresence>
            {question.reference ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a0f1e]/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
                  Referință
                </p>
                <p className="mt-2 text-base font-extrabold tracking-tight text-[#f59e0b] sm:text-lg">
                  {question.reference}
                </p>
              </div>
            ) : null}

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

            <div className="flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:gap-6">
              <p className="text-sm font-medium text-gray-100">
                <span className="tabular-nums font-extrabold text-[#f59e0b]">
                  {roundBreakdown.answered}
                </span>{" "}
                din <span className="tabular-nums">{roundBreakdown.playersTotal}</span>{" "}
                participanți au răspuns
              </p>
              <p className="text-sm text-gray-400">
                <span className="font-semibold text-emerald-400">
                  {roundBreakdown.correct}
                </span>{" "}
                corecte ·{" "}
                <span className="font-semibold text-red-400">
                  {roundBreakdown.answered - roundBreakdown.correct}
                </span>{" "}
                greșite <span className="opacity-70">·</span>{" "}
                <span className="font-semibold text-gray-200">
                  {roundBreakdown.answered > 0
                    ? Math.round(
                        (roundBreakdown.correct / roundBreakdown.answered) * 100,
                      )
                    : 0}
                  %
                </span>{" "}
                corecte
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
            </div>
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

        {isLastRound && (
          <p className="mb-8 text-center text-xs text-gray-400">
            După apăsare, sesiunea se închide și participanții văd ecranul final.
          </p>
        )}
      </div>
    );
  }

  if (status === "question_active" && questionStartedAt != null && question == null) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-gray-400">
        <p>Întrebare indisponibilă.</p>
      </div>
    );
  }

  // While the next question's timer hasn't started yet, always show the
  // intermission screen (prevents brief UI flicker during state transitions).
  if (status === "question_active" && sessionId && questionStartedAt == null) {
    return (
      <div className="relative flex min-h-dvh flex-col bg-[#0a0f1e]/40 px-6 py-6 text-gray-100 backdrop-blur-sm">
        <LiveReactionsOverlay bursts={reactionBursts} />
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
        <div className="w-full max-w-6xl">
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
                void refreshTop10(sessionId);
                if (teamModeRef.current) {
                  void refreshTeamTop(sessionId);
                }
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
            {teamMode ? (
              <p className="mt-2 text-sm font-semibold text-gray-400">
                {missingTeamCount == null
                  ? "Verific echipele…"
                  : missingTeamCount > 0
                    ? `Aștept echipe: ${missingTeamCount} participant(i) fără echipă`
                    : startedAt
                      ? "Toți participanții au echipă. Pornesc…"
                      : "Toți participanții au echipă. Aștept Adminul să pornească jocul."}
              </p>
            ) : null}
          </motion.div>

          <div className={`grid grid-cols-1 gap-6 lg:grid-cols-2`}>
            <div className="min-h-0">
              <p className="mb-3 text-sm font-extrabold uppercase tracking-wider text-gray-400">
                Jucători (Top 5)
              </p>
              <div className="max-h-[52vh] overflow-auto pr-1">
                <LeaderboardBarChart rows={leaderTop} maxBars={5} />
              </div>
            </div>

            <div className="min-h-0">
              <p className="mb-3 text-sm font-extrabold uppercase tracking-wider text-gray-400">
                Echipe (Top)
              </p>
              {teamMode ? (
                teamTop.length > 0 ? (
                  <ul className="max-h-[52vh] space-y-3 overflow-auto pr-1">
                    {teamTop.map((t, i) => (
                      <li
                        key={t.teamId}
                        className="flex items-center justify-between rounded-2xl border border-gray-700/50 bg-[#1a2236] px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="w-10 shrink-0 text-center font-extrabold text-gray-300">
                            {i === 0 ? <span aria-hidden>👑</span> : `${i + 1}.`}
                          </span>
                          <span className="truncate font-extrabold text-gray-100">
                            {t.name}
                          </span>
                          <span className="text-xs font-semibold text-gray-400">
                            ({t.members})
                          </span>
                        </span>
                        <span className="font-mono text-base font-extrabold tabular-nums text-[#f59e0b] sm:text-lg">
                          {t.score}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">
                    Încă nu sunt echipe (sau nu s-au alocat jucătorii).
                  </p>
                )
              ) : (
                <p className="text-sm text-gray-400">Team mode este oprit.</p>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onPointerDown={audio.unlocked ? undefined : audio.unlock}
      className={`relative mx-auto min-h-dvh w-full max-w-3xl px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-gray-100 lg:max-w-6xl lg:px-8 ${
        isHurry
          ? "relative before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.20)_0%,_rgba(10,15,30,0)_62%)] before:animate-pulse"
          : ""
      }`}
    >
      <LiveReactionsOverlay bursts={reactionBursts} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleQuitGame}
            disabled={quitBusy || !sessionId}
            className="rounded-2xl border border-red-500/45 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-45"
          >
            {quitBusy ? "…" : "Termină jocul!"}
          </button>
          {status === "question_active" && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipBusy || !sessionId}
              className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-45"
            >
              {skipBusy ? "…" : "Skip"}
            </button>
          )}
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
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="min-w-0">
              <article className="rounded-2xl border border-white/12 bg-[#1a2236]/35 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.14)] backdrop-blur-2xl sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-gray-400">
                    Întrebarea {questionIndex + 1} / {quizLen}
                  </p>
                  <span className="rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-3 py-1.5 font-mono text-sm font-extrabold tabular-nums text-[#f59e0b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
                    {timeLeft != null ? timeLeft : "—"}s
                  </span>
                </div>
                <h1
                  className={`mt-3 text-left font-extrabold leading-snug tracking-tight text-gray-100 ${questionTextSizeClass(
                    question!.text,
                  )}`}
                >
                  {question!.text}
                </h1>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        className={`relative overflow-hidden rounded-2xl p-4 ${tone}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="min-w-0 flex-1 text-sm font-extrabold leading-snug opacity-95 sm:text-base">
                            {opt}
                          </p>
                          <span className="shrink-0 rounded-full bg-black/15 px-3 py-1 font-mono text-sm font-black tabular-nums">
                            {i + 1}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </article>

              <footer className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                  <p className="text-base font-medium text-gray-100">
                    <span className="font-extrabold text-[#f59e0b]">{responseCount}</span>{" "}
                    din {playersCount} participanți au răspuns
                  </p>
                  {actionErr != null && (
                    <p className="mt-2 text-sm text-red-400">{actionErr}</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!canShowResults || busy}
                  onClick={handleShowResults}
                  className="min-h-12 w-full max-w-[19.5rem] self-center rounded-2xl bg-[#f59e0b] px-7 font-extrabold uppercase tracking-wide text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100 sm:w-auto"
                >
                  {busy ? "…" : "Afișează rezultatele"}
                </button>
              </footer>
            </div>

            <section className="rounded-2xl border border-gray-700/50 bg-[#1a2236] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-6 lg:sticky lg:top-4">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <p className="text-sm font-extrabold text-gray-100">Voturi live</p>
                <p className="text-xs font-semibold text-[#f59e0b]">
                  {responseCount}/{playersCount}
                </p>
              </div>
              <div className="grid gap-3">
                {OPTION_TONES.map((t, i) => {
                  const max = Math.max(1, ...liveVotes);
                  const pct = Math.round((liveVotes[i]! / max) * 100);
                  const shouldPulse = timeUp && correctIdx === i;
                  return (
                    <div
                      key={t.label}
                      className="flex items-center gap-4 rounded-2xl border border-gray-700/40 bg-[#0a0f1e] px-4 py-3 shadow-inner"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-gray-100">
                            {t.label}
                          </p>
                          <p className="shrink-0 font-mono text-sm font-extrabold tabular-nums text-[#f59e0b]">
                            {liveVotes[i]}
                          </p>
                        </div>
                        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#1a2236]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(6, pct)}%` }}
                            transition={{ type: "spring", stiffness: 260, damping: 28 }}
                            className={`h-full rounded-full bg-gradient-to-r ${t.bar} ${
                              shouldPulse
                                ? "shadow-[0_0_0_2px_rgba(245,158,11,0.5)_inset]"
                                : ""
                            }`}
                          >
                            {shouldPulse ? (
                              <motion.div
                                aria-hidden
                                initial={{ opacity: 0.35 }}
                                animate={{ opacity: [0.35, 0.9, 0.35] }}
                                transition={{
                                  duration: 0.9,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                                className="h-full w-full"
                              />
                            ) : null}
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
