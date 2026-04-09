import { PlayerGameClient } from "@/app/game/player/[pin]/player-game-client";
import { normalizeJoinPin } from "@/lib/game-logic";

type PageProps = { params: Promise<{ pin: string }> };

export default async function PlayerGamePage({ params }: PageProps) {
  const { pin: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const normalizedPin = normalizeJoinPin(decoded);

  if (normalizedPin == null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e] p-8">
        <p className="text-gray-400">PIN invalid.</p>
      </div>
    );
  }

  return <PlayerGameClient normalizedPin={normalizedPin} />;
}
