import { cookies } from "next/headers";

import { createSupabaseClient } from "@/lib/supabase";
import { normalizeJoinPin } from "@/lib/game-logic";
import { ADMIN_SESSION_KEY_COOKIE } from "@/lib/player-storage";
import type { Player } from "@/types/game";

import { ResultsPodium } from "./results-podium";
import { ResultsTeamsPodium, type TeamLeaderboardRow } from "./results-teams-podium";

type PageProps = {
  params: Promise<{ pin: string }>;
};

export default async function GameResultsPage({ params }: PageProps) {
  const { pin: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const pin = normalizeJoinPin(decoded);

  if (pin == null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e]/40 p-8 text-gray-100 backdrop-blur-sm">
        <p className="text-gray-400">PIN invalid.</p>
      </div>
    );
  }

  const supabase = createSupabaseClient();

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id, team_mode, results_published_at")
    .eq("pin", pin)
    .maybeSingle();

  if (sessionErr || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e]/40 p-8 text-gray-100 backdrop-blur-sm">
        <p className="text-gray-400">Nu există sesiune cu acest PIN.</p>
      </div>
    );
  }

  const sessionId = session.id as string;
  const teamMode = Boolean((session as any).team_mode ?? false);
  const publishedAt = (session as any).results_published_at as string | null | undefined;

  if (!publishedAt) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e]/40 p-8 text-gray-100 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-[#1a2236] p-8 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Joc terminat
          </p>
          <p className="mt-3 text-lg font-extrabold tracking-tight text-[#f59e0b]">
            Clasamentul nu a fost publicat încă
          </p>
          <p className="mt-3 text-sm text-gray-400">
            Așteaptă ca Adminul să apese „Vezi clasamentul”.
          </p>
        </div>
      </div>
    );
  }

  const cookieStore = await cookies();
  const isAdmin = Boolean(cookieStore.get(ADMIN_SESSION_KEY_COOKIE)?.value);
  const ctaHref = isAdmin ? "/host" : "/join";
  const ctaLabel = isAdmin ? "Generează joc nou" : "Joacă din nou";
  const adminStatsHref = `/game/summary/${encodeURIComponent(pin)}`;

  if (teamMode) {
    const { data: rows, error: playersErr } = await supabase
      .from("players")
      .select("team_id, score, teams(name)")
      .eq("session_id", sessionId);

    if (playersErr) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e]/40 p-8 text-gray-100 backdrop-blur-sm">
          <p className="max-w-md text-center text-red-400">
            Nu s-a putut încărca clasamentul. Verifică conexiunea și RLS pentru
            `players`.
          </p>
        </div>
      );
    }

    const agg = new Map<string, TeamLeaderboardRow>();
    for (const r of (rows ?? []) as any[]) {
      const tid = r.team_id as string | null;
      if (!tid) continue;
      const name = String(r.teams?.name ?? "Echipă");
      const cur =
        agg.get(tid) ?? ({ teamId: tid, name, score: 0, members: 0 } satisfies TeamLeaderboardRow);
      cur.score += Number(r.score ?? 0);
      cur.members += 1;
      agg.set(tid, cur);
    }
    const teams = Array.from(agg.values());
    teams.sort((a, b) => b.score - a.score);
    return (
      <ResultsTeamsPodium
        pin={pin}
        teams={teams}
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        adminStatsHref={isAdmin ? adminStatsHref : null}
      />
    );
  }

  const { data: rows, error: playersErr } = await supabase
    .from("players")
    .select("id, session_id, display_name, score, joined_at")
    .eq("session_id", sessionId)
    .order("score", { ascending: false });

  if (playersErr) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e]/40 p-8 text-gray-100 backdrop-blur-sm">
        <p className="max-w-md text-center text-red-400">
          Nu s-a putut încărca clasamentul. Verifică conexiunea și RLS pentru
          `players`.
        </p>
      </div>
    );
  }

  const players = (rows ?? []) as Player[];

  return (
    <ResultsPodium
      pin={pin}
      players={players}
      ctaHref={ctaHref}
      ctaLabel={ctaLabel}
      adminStatsHref={isAdmin ? adminStatsHref : null}
    />
  );
}
