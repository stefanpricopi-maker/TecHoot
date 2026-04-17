"use client";

import Link from "next/link";
import { UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { RealtimeChannel } from "@supabase/supabase-js";

import { joinTeam, listTeamsForPin, pingLobbyPresence } from "@/app/actions/game-actions";
import { createSupabaseClient } from "@/lib/supabase";
import {
  isLobbyPresenceFresh,
  LOBBY_HEARTBEAT_INTERVAL_MS,
  LOBBY_PRESENCE_TICK_MS,
  sortLobbyPlayersAlpha,
  upsertLobbyPlayer,
} from "@/lib/lobby-presence";
import { LS_PLAYER_ID_KEY } from "@/lib/player-storage";
import type { GameSession, Player } from "@/types/game";

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
  const playersChannelRef = useRef<RealtimeChannel | null>(null);
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
  const [teamMode, setTeamMode] = useState(false);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [myTeamName, setMyTeamName] = useState<string | null>(null);
  const [teamErr, setTeamErr] = useState<string | null>(null);
  const [teamBusy, setTeamBusy] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lobbySessionId, setLobbySessionId] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMyPlayerId(window.localStorage.getItem(LS_PLAYER_ID_KEY));
  }, []);

  useEffect(() => {
    const t = window.setInterval(
      () => setNowMs(Date.now()),
      LOBBY_PRESENCE_TICK_MS,
    );
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (lobbySessionId == null) return;
    const send = () => void pingLobbyPresence();
    send();
    const id = window.setInterval(send, LOBBY_HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [lobbySessionId]);

  useEffect(() => {
    if (normalizedPin == null) {
      setLobbySessionId(null);
      setPlayers([]);
      return;
    }

    const supabase = createSupabaseClient();
    let cancelled = false;
    setLobbySessionId(null);
    setPlayers([]);

    void (async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, status, question_count, randomize_questions, team_mode, quizzes(title)")
        .eq("pin", normalizedPin)
        .maybeSingle();

      const row = data as Pick<GameSession, "status"> | null;
      const sessionId = (data as { id?: string })?.id as string | undefined;
      const quizTitle =
        (data as { quizzes?: { title?: string } })?.quizzes?.title != null
          ? String((data as { quizzes?: { title?: string } }).quizzes!.title)
          : null;
      setSessionMeta({
        quizTitle,
        questionCount: (data as { question_count?: number | null })
          ?.question_count ?? null,
        randomizeQuestions: (data as { randomize_questions?: boolean | null })
          ?.randomize_questions ?? null,
      });
      const tm = Boolean((data as any)?.team_mode ?? false);
      setTeamMode(tm);

      if (sessionId) {
        if (cancelled) return;
        setLobbySessionId(sessionId);

        const { data: plist } = await supabase
          .from("players")
          .select("id, session_id, display_name, score, joined_at, last_seen_at, team_id, teams(name)")
          .eq("session_id", sessionId)
          .order("display_name", { ascending: true });
        setPlayers(sortLobbyPlayersAlpha((plist ?? []) as Player[]));

        if (tm) {
          const tRes = await listTeamsForPin(normalizedPin);
          if (tRes.ok) {
            setTeams(tRes.teams);
            setTeamErr(null);
          } else {
            setTeamErr(tRes.error);
          }
          const mine = (plist ?? []).find((p: any) => p.id === myPlayerId) as any;
          setMyTeamId((mine?.team_id as string | null) ?? null);
          setMyTeamName(
            mine?.team_id ? String(mine?.teams?.name ?? "") || null : null,
          );
        } else {
          setTeams([]);
          setMyTeamId(null);
          setMyTeamName(null);
          setTeamErr(null);
        }

        if (playersChannelRef.current) {
          void supabase.removeChannel(playersChannelRef.current);
          playersChannelRef.current = null;
        }

        const baseFilter = `session_id=eq.${sessionId}`;
        const pch = supabase
          .channel(`lobby-players:${sessionId}:${lobbyInstanceIdRef.current}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "players",
              filter: baseFilter,
            },
            (payload) => {
              const next = payload.new as Player;
              setPlayers((prev) => upsertLobbyPlayer(prev, next));
            },
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "players",
              filter: baseFilter,
            },
            (payload) => {
              const next = payload.new as Player;
              setPlayers((prev) => upsertLobbyPlayer(prev, next));
            },
          )
          .on(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: "players",
              filter: baseFilter,
            },
            (payload) => {
              const oldRow = payload.old as { id?: string };
              const id = oldRow?.id;
              if (!id) return;
              setPlayers((prev) => prev.filter((p) => p.id !== id));
            },
          );
        playersChannelRef.current = pch;
        pch.subscribe();
      }
      if (row?.status === "question_active" && !redirectedRef.current) {
        if (!pinMatches) {
          return;
        }
        if (tm && !myTeamId) {
          return;
        }
        redirectedRef.current = true;
        router.replace(`/game/player/${encodeURIComponent(normalizedPin)}`);
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
          const next = payload.new as {
            randomize_questions?: boolean;
            question_count?: number | null;
            status?: string;
          };
          if (
            typeof next?.randomize_questions === "boolean" ||
            next?.question_count != null
          ) {
            setSessionMeta((prev) => ({
              quizTitle: prev?.quizTitle ?? null,
              questionCount: next?.question_count ?? prev?.questionCount ?? null,
              randomizeQuestions:
                next?.randomize_questions ?? prev?.randomizeQuestions ?? null,
            }));
          }
          if (next.status === "question_active" && !redirectedRef.current) {
            if (!pinMatches) {
              return;
            }
            if (teamMode && !myTeamId) {
              return;
            }
            redirectedRef.current = true;
            router.replace(`/game/player/${encodeURIComponent(normalizedPin)}`);
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
  }, [normalizedPin, pinMatches, router, myPlayerId, teamMode, myTeamId]);

  const visiblePlayers = useMemo(() => {
    return sortLobbyPlayersAlpha(
      players.filter(
        (p) =>
          (myPlayerId != null && p.id === myPlayerId) ||
          isLobbyPresenceFresh(p, nowMs),
      ),
    );
  }, [players, myPlayerId, nowMs]);

  const myTeamMembers = useMemo(() => {
    if (!teamMode || !myTeamId) return [];
    return sortLobbyPlayersAlpha(
      visiblePlayers.filter((p: any) => (p as any).team_id === myTeamId),
    );
  }, [teamMode, myTeamId, visiblePlayers]);

  const pickTeam = async (teamId: string) => {
    if (!normalizedPin || !teamId) return;
    if (!myPlayerId) {
      setTeamErr("Lipsește jucătorul. Re-join la sesiune.");
      return;
    }
    setTeamBusy(true);
    setTeamErr(null);
    try {
      const res = await joinTeam(normalizedPin, myPlayerId, teamId);
      if (!res.ok) {
        setTeamErr(res.error);
        return;
      }
      const picked = teams.find((t) => t.id === teamId);
      setMyTeamId(teamId);
      setMyTeamName(picked?.name ?? null);
    } finally {
      setTeamBusy(false);
    }
  };

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

          {teamMode && (
            <div className="mt-6 rounded-2xl border border-gray-700/50 bg-[#0a0f1e] p-5 text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Team mode
              </p>
              {myTeamId ? (
                <>
                  <p className="mt-2 text-sm font-semibold text-gray-100">
                    Echipa ta:{" "}
                    <span className="font-extrabold text-[#f59e0b]">
                      {myTeamName ?? "—"}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    În echipa ta au intrat:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {myTeamMembers.map((p) => (
                      <li key={p.id} className="flex items-center gap-2">
                        <UserCircle className="size-4 text-gray-500" />
                        <span className="truncate text-gray-100">
                          {p.display_name}
                        </span>
                      </li>
                    ))}
                    {myTeamMembers.length === 0 && (
                      <li className="text-xs text-gray-500">—</li>
                    )}
                  </ul>
                  <p className="mt-3 text-xs text-gray-400">
                    Așteaptă ca Adminul să pornească jocul.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-gray-300">
                    Alege o echipă ca să intri în lobby.
                  </p>
                  {teamErr && (
                    <p className="mt-3 text-sm text-red-300">{teamErr}</p>
                  )}
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {teams.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        Nu există încă echipe. Așteaptă să le creeze gazda.
                      </p>
                    ) : (
                      teams.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          disabled={teamBusy}
                          onClick={() => void pickTeam(t.id)}
                          className="min-h-11 rounded-2xl border border-gray-700/50 bg-[#1a2236] px-4 py-2 text-left text-sm font-semibold text-gray-100 disabled:opacity-50"
                        >
                          {teamBusy ? "…" : t.name}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
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
                Prezenți în lobby ({visiblePlayers.length}
                {players.length !== visiblePlayers.length
                  ? ` / ${players.length}`
                  : ""}
                )
              </p>
              <ul className="mt-4 grid gap-3">
                {visiblePlayers.length === 0 ? (
                  <li className="text-sm text-gray-400">
                    Încă nu e nimeni activ aici (sau lista se actualizează).
                  </li>
                ) : (
                  visiblePlayers.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 rounded-2xl border border-gray-700/40 bg-[#1a2236] px-3 py-2"
                    >
                      <UserCircle
                        className={`size-9 shrink-0 ${
                          myPlayerId === p.id
                            ? "text-gray-100"
                            : "text-[#f59e0b]/75"
                        }`}
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
