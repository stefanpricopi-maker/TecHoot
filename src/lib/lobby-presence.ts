import type { Player } from "@/types/game";

/** Heartbeat la ~22s; UI ascunde jucători fără ping ~75s (3× interval + marjă). */
export const LOBBY_HEARTBEAT_INTERVAL_MS = 22_000;
export const LOBBY_PRESENCE_STALE_MS = 75_000;
/** Retick pentru filtrarea „prezenței” fără a așpta heartbeat-uri. */
export const LOBBY_PRESENCE_TICK_MS = 8_000;

export function sortLobbyPlayersAlpha(list: Player[]): Player[] {
  return [...list].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, "ro", { sensitivity: "base" }),
  );
}

export function upsertLobbyPlayer(prev: Player[], row: Player): Player[] {
  const ix = prev.findIndex((p) => p.id === row.id);
  const merged =
    ix === -1
      ? [...prev, row]
      : prev.map((p, i) => (i === ix ? { ...p, ...row } : p));
  return sortLobbyPlayersAlpha(merged);
}

export interface LobbyPresenceTimestamps {
  last_seen_at?: string | null;
  joined_at: string;
}

export function isLobbyPresenceFresh(
  p: LobbyPresenceTimestamps,
  nowMs: number,
): boolean {
  const raw = p.last_seen_at ?? p.joined_at;
  const t = Date.parse(String(raw));
  if (!Number.isFinite(t)) return true;
  return nowMs - t < LOBBY_PRESENCE_STALE_MS;
}
