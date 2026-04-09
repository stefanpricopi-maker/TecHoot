import { createSupabaseClient } from "@/lib/supabase";
import { normalizeJoinPin } from "@/lib/game-logic";
import type { Player } from "@/types/game";

import { ResultsPodium } from "./results-podium";

type PageProps = {
  params: Promise<{ pin: string }>;
};

export default async function GameResultsPage({ params }: PageProps) {
  const { pin: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const pin = normalizeJoinPin(decoded);

  if (pin == null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e] p-8 text-gray-100">
        <p className="text-gray-400">PIN invalid.</p>
      </div>
    );
  }

  const supabase = createSupabaseClient();

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id")
    .eq("pin", pin)
    .maybeSingle();

  if (sessionErr || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e] p-8 text-gray-100">
        <p className="text-gray-400">Nu există sesiune cu acest PIN.</p>
      </div>
    );
  }

  const sessionId = session.id as string;

  const { data: rows, error: playersErr } = await supabase
    .from("players")
    .select("id, session_id, display_name, score, joined_at")
    .eq("session_id", sessionId)
    .order("score", { ascending: false });

  if (playersErr) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e] p-8 text-gray-100">
        <p className="max-w-md text-center text-red-400">
          Nu s-a putut încărca clasamentul. Verifică conexiunea și RLS pentru
          `players`.
        </p>
      </div>
    );
  }

  const players = (rows ?? []) as Player[];

  return <ResultsPodium pin={pin} players={players} />;
}
