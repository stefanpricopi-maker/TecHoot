"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  createSession,
  listQuizzes,
  startGame,
} from "@/app/actions/game-actions";
import { createSupabaseClient } from "@/lib/supabase";
import type { Player } from "@/types/game";

export default function HostPage() {
  const router = useRouter();
  const [pin, setPin] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<{ id: string; title: string | null }[]>(
    [],
  );
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [desiredQuestionCount, setDesiredQuestionCount] = useState<number>(10);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [quizzesError, setQuizzesError] = useState<string | null>(null);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [selectedQuizTotal, setSelectedQuizTotal] = useState<number | null>(null);

  const loadQuizzes = useCallback(
    async (opts?: { preserveSelection?: boolean }) => {
      setQuizzesLoading(true);
      setQuizzesError(null);
      const result = await listQuizzes();
      if (result.ok) {
        setQuizzes(result.quizzes);
        setSelectedQuizId((prev) => {
          if (opts?.preserveSelection && prev && result.quizzes.some((q) => q.id === prev)) {
            return prev;
          }
          if (prev && result.quizzes.some((q) => q.id === prev)) {
            return prev;
          }
          return result.quizzes[0]?.id ?? "";
        });
      } else {
        setQuizzesError(result.error);
        setQuizzes([]);
        setSelectedQuizId("");
      }
      setQuizzesLoading(false);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadQuizzes();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadQuizzes]);

  async function handleCreateGame() {
    setError(null);
    setStartError(null);
    if (!selectedQuizId) {
      setError("Alege un quiz din listă (sau creează unul în Supabase).");
      return;
    }
    setLoading(true);
    try {
      const result = await createSession(
        selectedQuizId,
        desiredQuestionCount,
        randomizeQuestions,
      );
      if (result.ok) {
        setPin(result.pin);
        setSessionId(result.sessionId);
        setPlayers([]);
      } else {
        setPin(null);
        setSessionId(null);
        setPlayers([]);
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedQuizId) {
      setSelectedQuizTotal(null);
      return;
    }
    const supabase = createSupabaseClient();
    void (async () => {
      const { count } = await supabase
        .from("questions_public")
        .select("*", { count: "exact", head: true })
        .eq("quiz_id", selectedQuizId);
      setSelectedQuizTotal(count ?? 0);
      setDesiredQuestionCount((prev) => {
        const max = Math.max(1, count ?? 1);
        if (prev < 1) return 1;
        if (prev > max) return max;
        return prev;
      });
    })();
  }, [selectedQuizId]);

  const handleStart = useCallback(async () => {
    if (!sessionId || pin == null) {
      return;
    }
    setStartError(null);
    setStartLoading(true);
    try {
      const result = await startGame(sessionId);
      if (result.ok) {
        router.push(`/game/host/${encodeURIComponent(pin)}`);
      } else {
        setStartError(result.error);
      }
    } finally {
      setStartLoading(false);
    }
  }, [sessionId, pin, router]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const supabase = createSupabaseClient();

    void (async () => {
      const { data, error: fetchError } = await supabase
        .from("players")
        .select(
          "id, session_id, display_name, score, joined_at",
        )
        .eq("session_id", sessionId)
        .order("joined_at", { ascending: true });

      if (!fetchError && data) {
        setPlayers(data as Player[]);
      }
    })();

    const channel = supabase
      .channel(`host-players:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as Player;
          setPlayers((prev) => {
            if (prev.some((p) => p.id === row.id)) {
              return prev;
            }
            return [...prev, row];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Admin
        </h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/65">
          Cod PIN și participanți în timp real
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--foreground)]">
          Quiz
          <div className="flex gap-2">
          <select
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            disabled={quizzesLoading || quizzes.length === 0 || loading}
            className="min-h-12 flex-1 rounded-xl border border-[var(--foreground)]/20 bg-[var(--background)] px-3 py-2 text-[var(--foreground)] disabled:opacity-50"
          >
            {quizzes.length === 0 && !quizzesLoading ? (
              <option value="">— Niciun quiz în baza de date —</option>
            ) : (
              quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title?.trim() ? q.title : q.id}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={() => void loadQuizzes({ preserveSelection: true })}
            disabled={quizzesLoading || loading}
            className="min-h-12 shrink-0 rounded-xl border border-[var(--foreground)]/25 bg-[var(--background)] px-4 text-sm font-medium text-[var(--foreground)] disabled:opacity-50"
            title="Reîncarcă quiz-urile din Supabase"
          >
            {quizzesLoading ? "…" : "Reîncarcă"}
          </button>
          </div>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--foreground)]">
          Număr întrebări
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={selectedQuizTotal ?? undefined}
            value={desiredQuestionCount}
            onChange={(e) => setDesiredQuestionCount(Number(e.target.value))}
            disabled={quizzesLoading || quizzes.length === 0 || loading}
            className="min-h-12 rounded-xl border border-[var(--foreground)]/20 bg-[var(--background)] px-3 py-2 text-[var(--foreground)] disabled:opacity-50"
          />
        </label>
        {selectedQuizTotal != null && (
          <p className="text-xs text-[var(--foreground)]/55">
            Disponibile în quiz: <span className="tabular-nums">{selectedQuizTotal}</span>
          </p>
        )}

        <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--foreground)]/15 bg-[var(--background)] px-4 py-3 text-sm">
          <span className="font-medium text-[var(--foreground)]">
            Randomizează întrebările
          </span>
          <input
            type="checkbox"
            checked={randomizeQuestions}
            onChange={(e) => setRandomizeQuestions(e.target.checked)}
            disabled={loading}
            className="h-5 w-5 accent-[var(--foreground)] disabled:opacity-50"
          />
        </label>
        {quizzesLoading && (
          <p className="text-xs text-[var(--foreground)]/55">
            Se încarcă quiz-urile…
          </p>
        )}
        {quizzesError != null && (
          <p className="text-xs text-red-600 dark:text-red-400">{quizzesError}</p>
        )}
        {!quizzesLoading && quizzes.length === 0 && quizzesError == null && (
          <p className="text-xs text-[var(--foreground)]/55">
            Adaugă rânduri în tabelul <code className="rounded bg-[var(--foreground)]/10 px-1">quizzes</code>{" "}
            (și întrebări în <code className="rounded bg-[var(--foreground)]/10 px-1">questions</code>) în
            Supabase.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={handleCreateGame}
          disabled={loading || quizzesLoading || quizzes.length === 0}
          className="min-h-12 flex-1 rounded-xl bg-[var(--foreground)] px-5 font-semibold text-[var(--background)] disabled:opacity-50 sm:max-w-xs"
        >
          {loading ? "Se pregătește…" : "Lansează Sesiunea"}
        </button>

        {sessionId != null && (
          <button
            type="button"
            onClick={handleStart}
            disabled={startLoading}
            className="min-h-12 flex-1 rounded-xl border-2 border-[var(--foreground)] bg-[var(--background)] px-5 font-bold uppercase tracking-wide text-[var(--foreground)] active:opacity-90 disabled:opacity-50 sm:max-w-xs"
          >
            {startLoading ? "…" : "Start"}
          </button>
        )}
      </div>

      {pin != null && (
        <div className="rounded-2xl border border-[var(--foreground)]/15 bg-[var(--background)] p-5 text-center shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--foreground)]/55">
            PIN sesiune
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-[0.35em] text-[var(--foreground)] sm:text-4xl">
            {pin}
          </p>
        </div>
      )}

      {error != null && (
        <p className="text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {startError != null && (
        <p className="text-center text-sm text-red-600 dark:text-red-400">
          {startError}
        </p>
      )}

      {sessionId != null && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Participanți ({players.length})
          </h2>
          <ul className="divide-y divide-[var(--foreground)]/10 overflow-hidden rounded-2xl border border-[var(--foreground)]/12 bg-[var(--background)]">
            {players.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[var(--foreground)]/55">
                Încă nimeni. Dă PIN-ul mai departe.
              </li>
            ) : (
              players.map((p) => (
                <li
                  key={p.id}
                  className="flex min-h-12 items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="truncate font-medium text-[var(--foreground)]">
                    {p.display_name}
                  </span>
                  <span className="tabular-nums text-sm text-[var(--foreground)]/55">
                    {p.score} puncte
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
