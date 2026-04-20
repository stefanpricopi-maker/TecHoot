"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { startGame } from "@/app/actions/game-actions";
import { PlayerAvatar } from "@/components/player-avatar";
import {
  isLobbyPresenceFresh,
  LOBBY_PRESENCE_TICK_MS,
  sortLobbyPlayersAlpha,
  upsertLobbyPlayer,
} from "@/lib/lobby-presence";
import { createSupabaseClient } from "@/lib/supabase";
import type { Player } from "@/types/game";

export function HostLobbyClient(props: { pin: string; sessionId: string }) {
  const router = useRouter();
  const pin = props.pin;
  const sessionId = props.sessionId;

  const [players, setPlayers] = useState<Player[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const activePlayerTimeoutRef = useRef<number | null>(null);
  const [joinUrl, setJoinUrl] = useState<string>("");
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (!pin) {
      setJoinUrl("");
      return;
    }
    setJoinUrl(`${window.location.origin}/join?pin=${encodeURIComponent(pin)}`);
  }, [pin]);

  useEffect(() => {
    const t = window.setInterval(
      () => setNowMs(Date.now()),
      LOBBY_PRESENCE_TICK_MS,
    );
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createSupabaseClient();

    void (async () => {
      const { data, error: fetchError } = await supabase
        .from("players")
        .select(
          "id, session_id, display_name, avatar_key, score, joined_at, last_seen_at",
        )
        .eq("session_id", sessionId)
        .order("display_name", { ascending: true });

      if (!fetchError && data) {
        setPlayers(sortLobbyPlayersAlpha(data as Player[]));
      }
    })();

    const baseFilter = `session_id=eq.${sessionId}`;
    const channel = supabase
      .channel(`host-players:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: baseFilter,
        },
        (payload) => {
          const row = payload.new as Player;

          setActivePlayerId(row.id);
          if (activePlayerTimeoutRef.current != null) {
            window.clearTimeout(activePlayerTimeoutRef.current);
          }
          activePlayerTimeoutRef.current = window.setTimeout(() => {
            setActivePlayerId(null);
            activePlayerTimeoutRef.current = null;
          }, 3000);

          setPlayers((prev) => upsertLobbyPlayer(prev, row));
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
          const row = payload.new as Player;
          setPlayers((prev) => upsertLobbyPlayer(prev, row));
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
      )
      .subscribe();

    return () => {
      if (activePlayerTimeoutRef.current != null) {
        window.clearTimeout(activePlayerTimeoutRef.current);
        activePlayerTimeoutRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const visiblePlayers = useMemo(
    () =>
      sortLobbyPlayersAlpha(
        players.filter((p) => isLobbyPresenceFresh(p, nowMs)),
      ),
    [players, nowMs],
  );

  const handleStart = useCallback(async () => {
    if (!sessionId || !pin) return;
    if (visiblePlayers.length < 1) {
      setStartError(
        "Așteaptă măcar 1 jucător activ în lobby înainte să pornești jocul.",
      );
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
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "Nu s-a putut porni jocul (eroare necunoscută).";
      setStartError(
        msg.includes("SUPABASE_SERVICE_ROLE_KEY")
          ? "Lipsește SUPABASE_SERVICE_ROLE_KEY în Environment Variables pe Vercel (server-only)."
          : msg,
      );
    } finally {
      setStartLoading(false);
    }
  }, [sessionId, pin, router, visiblePlayers.length]);

  const missing = !pin || !sessionId;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-6 py-10 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] text-gray-100 lg:max-w-6xl lg:px-8">
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

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/host")}
          className="min-h-11 rounded-2xl border border-gray-700/50 bg-[#1a2236] px-5 text-sm font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Înapoi
        </button>

        <div className="text-right" />
      </div>

      {missing ? (
        <div className="rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <p className="text-sm text-gray-400">
            Sesiunea nu e încă setată. Apasă Back și creează o sesiune nouă.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-8">
            <div className="rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] lg:sticky lg:top-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                PIN sesiune
              </p>
              <p className="mt-4 text-4xl font-extrabold tabular-nums tracking-[0.35em] text-[#f59e0b] sm:text-5xl">
                {pin}
              </p>

              <div className="mt-8 grid place-items-center gap-4">
                {joinUrl ? (
                  <div className="rounded-2xl border border-gray-700/50 bg-[#f8fafc] p-4 shadow-lg">
                    <QRCodeSVG value={joinUrl} size={180} />
                  </div>
                ) : (
                  <div className="h-[212px] w-[212px] animate-pulse rounded-2xl border border-gray-700/50 bg-[#0a0f1e]" />
                )}

                <p className="text-xs text-gray-400">
                  Scanează ca să intri direct în joc
                </p>

                {joinUrl && (
                  <a
                    href={joinUrl}
                    className="max-w-full truncate text-xs font-medium text-[#f59e0b] underline decoration-[#f59e0b]/40 underline-offset-4 hover:text-amber-300"
                  >
                    {joinUrl}
                  </a>
                )}
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={startLoading || visiblePlayers.length < 1}
                  className="min-h-14 w-full rounded-2xl border-2 border-[#f59e0b] bg-[#0a0f1e] px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-[#f59e0b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                >
                  {startLoading ? "…" : "Start"}
                </button>

                {visiblePlayers.length < 1 && startError == null && (
                  <p className="mt-4 text-left text-xs text-gray-400">
                    Așteaptă măcar un participant activ (cu tab deschis în lobby).
                  </p>
                )}

                {startError != null && (
                  <p className="mt-4 text-left text-sm text-red-400">
                    {startError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <section className="rounded-2xl border border-gray-700/50 bg-[#1a2236] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-8">
              <div className="mb-6 flex items-baseline justify-between gap-3">
                <h2 className="text-base font-extrabold tracking-tight text-gray-100">
                  Prezenți ({visiblePlayers.length}
                  {players.length !== visiblePlayers.length
                    ? ` / ${players.length}`
                    : ""}
                  )
                </h2>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#f59e0b]">
                  live
                </p>
              </div>
              <ul className="grid gap-4">
                {visiblePlayers.length === 0 ? (
                  <li className="rounded-2xl border border-gray-700/40 bg-[#0a0f1e] px-6 py-10 text-center text-sm text-gray-400">
                    Niciun jucător activ în lobby (tab deschis + heartbeat).
                  </li>
                ) : (
                  visiblePlayers.map((p) => (
                    <li
                      key={p.id}
                      className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-gray-700/50 bg-[#0a0f1e] px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <PlayerAvatar
                          avatarKey={(p as any).avatar_key}
                          className={
                            activePlayerId === p.id
                              ? "border-gray-300/40"
                              : "border-[#f59e0b]/25"
                          }
                          size="lg"
                        />
                        <span className="truncate font-semibold text-gray-100">
                          {p.display_name}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-sm font-bold text-[#f59e0b]">
                        {p.score} pt
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
