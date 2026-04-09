"use client";

import Link from "next/link";
import { UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createSupabaseClient } from "@/lib/supabase";
import type { GameSession, Player } from "@/types/game";

function sortPlayersAlpha(list: Player[]) {
  return [...list].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, "ro", { sensitivity: "base" }),
  );
}

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
  const playersChannelRef = useRef<any>(null);
  const lobbyInstanceIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  );
  const [sessionMeta, setSessionMeta] = useState<{
    quizTitle: string | null;
    questionCount: number | null;
    randomizeQuestions: boolean | null;
  } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (normalizedPin == null) {
      return;
    }

    const supabase = createSupabaseClient();
    let cancelled = false;

    void (async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, status, question_count, randomize_questions, quizzes(title)")
        .eq("pin", normalizedPin)
        .maybeSingle();

      const row = data as Pick<GameSession, "status"> | null;
      const sessionId = (data as any)?.id as string | undefined;
      const quizTitle =
        (data as any)?.quizzes?.title != null ? ((data as any).quizzes.title as string) : null;
      setSessionMeta({
        quizTitle,
        questionCount: (data as any)?.question_count ?? null,
        randomizeQuestions: (data as any)?.randomize_questions ?? null,
      });

      if (sessionId) {
        if (cancelled) return;

        const { data: plist } = await supabase
          .from("players")
          .select("id, session_id, display_name, score, joined_at")
          .eq("session_id", sessionId)
          .order("display_name", { ascending: true });
        setPlayers(sortPlayersAlpha((plist ?? []) as Player[]));

        if (playersChannelRef.current) {
          void supabase.removeChannel(playersChannelRef.current);
          playersChannelRef.current = null;
        }

        const pch = supabase
          .channel(`lobby-players:${sessionId}:${lobbyInstanceIdRef.current}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "players",
              filter: `session_id=eq.${sessionId}`,
            },
            (payload) => {
              const next = payload.new as Player;
              setPlayers((prev) => {
                if (prev.some((p) => p.id === next.id)) return prev;
                return sortPlayersAlpha([...prev, next]);
              });
            },
          );
        playersChannelRef.current = pch;
        pch.subscribe();
      }
      if (
        row?.status === "question_active" &&
        !redirectedRef.current
      ) {
        if (!pinMatches) {
          return;
        }
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
            if (!pinMatches) {
              return;
            }
            redirectedRef.current = true;
            router.replace(
          `/game/player/${encodeURIComponent(normalizedPin)}`,
        );
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
      if (playersChannelRef.current) {
        void supabase.removeChannel(playersChannelRef.current);
        playersChannelRef.current = null;
      }
    };
  }, [normalizedPin, pinMatches, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-gray-100">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-10">
          <p
            className="mt-4 text-3xl font-extrabold tabular-nums tracking-widest text-[#f59e0b] sm:text-4xl"
            aria-label={`Cod sesiune ${pinDisplay}`}
          >
            {pinDisplay}
          </p>

          {!pinMatches && (
            <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/95">
              Sesiunea din browser nu corespunde acestui link.{" "}
              <Link
                href="/join"
                className="font-semibold text-[#f59e0b] underline underline-offset-2"
              >
                Intră din nou
              </Link>
              .
            </p>
          )}

          {pinMatches && nickname && (
            <p className="mt-8 text-lg text-gray-100 sm:text-xl">
              Salut,{" "}
              <span className="font-extrabold text-[#f59e0b]">
                {nickname}
              </span>
              !
            </p>
          )}

          {pinMatches && !nickname && (
            <p className="mt-8 text-sm text-gray-400">
              Chill — Adminul pornește imediat.
            </p>
          )}

          {pinMatches && (
            <p className="mt-6 text-sm text-gray-100">
              Așteaptă până intră toți participanții.
            </p>
          )}

          {pinMatches && sessionMeta != null && (
            <div className="mt-8 space-y-2 text-left text-sm text-gray-400">
              {sessionMeta.quizTitle && (
                <p>
                  Întrebări din Cartea:{" "}
                  <span className="font-semibold text-gray-100">
                    {sessionMeta.quizTitle}
                  </span>
                </p>
              )}
              <p>
                Nr. întrebări:{" "}
                <span className="font-semibold text-gray-100">
                  {sessionMeta.questionCount ?? "toate"}
                </span>
              </p>
            </div>
          )}

          {normalizedPin != null && (
            <div className="mt-8 rounded-2xl border border-gray-700/50 bg-[#0a0f1e] p-6 text-left shadow-inner">
              <p className="text-xs font-bold uppercase tracking-wider text-[#f59e0b]">
                Participanți ({players.length})
              </p>
              <ul className="mt-4 grid gap-3">
                {players.length === 0 ? (
                  <li className="text-sm text-gray-400">
                    Încă nu a intrat nimeni.
                  </li>
                ) : (
                  players.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 rounded-2xl border border-gray-700/40 bg-[#1a2236] px-3 py-2"
                    >
                      <UserCircle
                        className="size-9 shrink-0 text-[#f59e0b]/75"
                        strokeWidth={1.25}
                        aria-hidden
                      />
                      <span className="truncate font-semibold text-gray-100">
                        {p.display_name}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        <Link
          href="/"
          className="inline-block text-sm text-gray-400 underline-offset-4 transition-colors hover:text-[#f59e0b] hover:underline"
        >
          Înapoi acasă
        </Link>
      </div>
    </div>
  );
}
