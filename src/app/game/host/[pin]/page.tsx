import { HostGameClient } from "@/app/game/host/[pin]/host-game-client";
import { normalizeJoinPin } from "@/lib/game-logic";

type PageProps = { params: Promise<{ pin: string }> };

export default async function HostGamePage({ params }: PageProps) {
  const { pin: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const normalizedPin = normalizeJoinPin(decoded);

  if (normalizedPin == null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0f1e]/40 p-8 backdrop-blur-sm">
        <p className="text-gray-400">PIN invalid.</p>
      </div>
    );
  }

  return <HostGameClient normalizedPin={normalizedPin} />;
}
