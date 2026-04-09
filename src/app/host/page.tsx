"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  createSession,
  listQuizzes,
} from "@/app/actions/game-actions";
import { createSupabaseClient } from "@/lib/supabase";

export default function HostPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<{ id: string; title: string | null }[]>(
    [],
  );
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [desiredQuestionCount, setDesiredQuestionCount] = useState<number>(10);
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

  const handleBack = useCallback(() => {
    router.push("/");
  }, [router]);

  async function handleCreateGame() {
    setError(null);
    if (!selectedQuizId) {
      setError("Alege un quiz din listă (sau creează unul în Supabase).");
      return;
    }
    setLoading(true);
    try {
      const result = await createSession(
        selectedQuizId,
        desiredQuestionCount,
        true,
      );
      if (result.ok) {
        router.push(
          `/host/lobby?pin=${encodeURIComponent(result.pin)}&sessionId=${encodeURIComponent(
            result.sessionId,
          )}`,
        );
      } else {
        setError(result.error);
      }
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "Nu s-a putut lansa sesiunea (eroare necunoscută).";
      setError(
        msg.includes("SUPABASE_SERVICE_ROLE_KEY")
          ? "Lipsește SUPABASE_SERVICE_ROLE_KEY în Environment Variables pe Vercel (server-only)."
          : msg,
      );
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

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-6 py-10 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] text-gray-100 lg:max-w-6xl lg:px-8">
      <button
        type="button"
        onClick={handleBack}
        className="absolute left-6 top-6 min-h-11 rounded-2xl border border-gray-700/50 bg-[#1a2236] px-5 text-sm font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Înapoi
      </button>
      <Link
        href="/admin"
        className="fixed right-4 top-4 z-50 grid size-12 place-items-center rounded-2xl border border-gray-700/50 bg-[#1a2236] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        aria-label="Setări Admin"
        title="Setări Admin"
      >
        <span className="text-xl leading-none text-[#f59e0b]" aria-hidden>
          ⚙
        </span>
      </Link>
      <header className="pt-10 text-center lg:pt-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#f59e0b] sm:text-4xl">
          Creează joc nou
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-8">
          <div className="rounded-2xl border border-gray-700/50 bg-[#1a2236] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-base font-extrabold tracking-tight text-gray-100">
                Setări sesiune
              </h2>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-end">
                <label className="flex flex-col gap-2 text-sm font-medium text-gray-100">
                  Întrebări din Cartea
                  <div className="flex gap-2">
                    <select
                      value={selectedQuizId}
                      onChange={(e) => setSelectedQuizId(e.target.value)}
                      disabled={quizzesLoading || quizzes.length === 0 || loading}
                      className="min-h-12 flex-1 rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-3 py-2 text-gray-100 shadow-inner disabled:opacity-50"
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
                  </div>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-gray-100">
                  Număr întrebări
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={selectedQuizTotal ?? undefined}
                    value={desiredQuestionCount}
                    onChange={(e) => setDesiredQuestionCount(Number(e.target.value))}
                    disabled={quizzesLoading || quizzes.length === 0 || loading}
                    className="min-h-12 rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-3 py-2 text-gray-100 shadow-inner disabled:opacity-50"
                  />
                </label>
              </div>
            {selectedQuizTotal != null && (
              <p className="text-xs text-gray-400">
                Întrebări disponibile:{" "}
                <span className="tabular-nums font-semibold text-[#f59e0b]">{selectedQuizTotal}</span>
              </p>
            )}

            {quizzesLoading && (
              <p className="text-xs text-gray-400">
                Se încarcă quiz-urile…
              </p>
            )}
            {quizzesError != null && (
              <p className="text-xs text-red-400">{quizzesError}</p>
            )}
            {!quizzesLoading && quizzes.length === 0 && quizzesError == null && (
              <p className="text-xs text-gray-400">
                Adaugă rânduri în tabelul{" "}
                <code className="rounded-lg bg-[#0a0f1e] px-1.5 py-0.5 text-gray-300">quizzes</code>{" "}
                (și întrebări în{" "}
                <code className="rounded-lg bg-[#0a0f1e] px-1.5 py-0.5 text-gray-300">questions</code>) în
                Supabase.
              </p>
            )}

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-start">
                <button
                  type="button"
                  onClick={handleCreateGame}
                  disabled={loading || quizzesLoading || quizzes.length === 0}
                  className="min-h-12 flex-1 rounded-2xl bg-[#f59e0b] px-6 font-bold text-[#0a0f1e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 sm:max-w-xs"
                >
                  {loading ? "Se generează…" : "Generează sesiune"}
                </button>
              </div>

              {error != null && (
                <p className="mt-4 text-left text-sm text-red-400">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="hidden lg:block" />
      </div>
    </div>
  );
}
