"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createSupabaseClient } from "@/lib/supabase";
import type { GameSession } from "@/types/game";

type LobbyClientProps = {
  normalizedPin: string | null;
  pinDisplay: string;
  pinMatches: boolean;
  nickname: string | null;
};

export function LobbyClient({
  normalizedPin,
  pinDisplay,
  pinMatches,
  nickname,
}: LobbyClientProps) {
  const router = useRouter();
  const redirectedRef = useRef(false);
  const [sessionMeta, setSessionMeta] = useState<{
    quizTitle: string | null;
    questionCount: number | null;
    randomizeQuestions: boolean | null;
  } | null>(null);

  useEffect(() => {
    if (!pinMatches || normalizedPin == null) {
      return;
    }

    const supabase = createSupabaseClient();

    void (async () => {
      const { data } = await supabase
        .from("sessions")
        .select("status, question_count, randomize_questions, quizzes(title)")
        .eq("pin", normalizedPin)
        .maybeSingle();

      const row = data as Pick<GameSession, "status"> | null;
      const quizTitle =
        (data as any)?.quizzes?.title != null ? ((data as any).quizzes.title as string) : null;
      setSessionMeta({
        quizTitle,
        questionCount: (data as any)?.question_count ?? null,
        randomizeQuestions: (data as any)?.randomize_questions ?? null,
      });
      if (
        row?.status === "question_active" &&
        !redirectedRef.current
      ) {
        redirectedRef.current = true;
        router.replace(
          `/game/player/${encodeURIComponent(normalizedPin)}`,
        );
      }
    })();

    const channel = supabase
      .channel(`lobby-session:${normalizedPin}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `pin=eq.${normalizedPin}`,
        },
        (payload) => {
          const next = payload.new as any;
          if (typeof next?.randomize_questions === "boolean" || next?.question_count != null) {
            setSessionMeta((prev) => ({
              quizTitle: prev?.quizTitle ?? null,
              questionCount: next?.question_count ?? prev?.questionCount ?? null,
              randomizeQuestions:
                next?.randomize_questions ?? prev?.randomizeQuestions ?? null,
            }));
          }
          if (
            next.status === "question_active" &&
            !redirectedRef.current
          ) {
            redirectedRef.current = true;
            router.replace(
          `/game/player/${encodeURIComponent(normalizedPin)}`,
        );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [normalizedPin, pinMatches, router]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-safe pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="rounded-2xl border border-[var(--foreground)]/15 bg-[var(--background)] p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium uppercase tracking-wider text-[var(--foreground)]/60">
            Lobby
          </p>
          <p
            className="mt-3 text-3xl font-bold tabular-nums tracking-widest text-[var(--foreground)] sm:text-4xl"
            aria-label={`Cod sesiune ${pinDisplay}`}
          >
            {pinDisplay}
          </p>

          {!pinMatches && (
            <p className="mt-4 text-sm text-amber-800 dark:text-amber-200">
              Sesiunea din browser nu corespunde acestui link.{" "}
              <Link
                href="/join"
                className="font-medium underline underline-offset-2"
              >
                Intră din nou
              </Link>
              .
            </p>
          )}

          {pinMatches && nickname && (
            <p className="mt-5 text-base text-[var(--foreground)]/85 sm:text-lg">
              Salut,{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {nickname}
              </span>
              !
            </p>
          )}

          {pinMatches && !nickname && (
            <p className="mt-5 text-sm text-[var(--foreground)]/70">
              Chill — Adminul pornește imediat.
            </p>
          )}

          {pinMatches && (
            <p className="mt-6 text-sm text-[var(--foreground)]/60">
              Rămâi aici. Te trimitem automat în joc când Adminul dă drumul la rundă.
            </p>
          )}

          {pinMatches && sessionMeta != null && (
            <div className="mt-6 space-y-1 text-sm text-[var(--foreground)]/70">
              {sessionMeta.quizTitle && (
                <p>
                  Quiz:{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {sessionMeta.quizTitle}
                  </span>
                </p>
              )}
              <p>
                Întrebări:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {sessionMeta.questionCount ?? "toate"}
                </span>
              </p>
              <p>
                Random:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {sessionMeta.randomizeQuestions == null
                    ? "—"
                    : sessionMeta.randomizeQuestions
                      ? "da"
                      : "nu"}
                </span>
              </p>
            </div>
          )}
        </div>

        <Link
          href="/"
          className="inline-block text-sm text-[var(--foreground)]/55 underline-offset-4 hover:text-[var(--foreground)] hover:underline"
        >
          Înapoi acasă
        </Link>
      </div>
    </div>
  );
}
