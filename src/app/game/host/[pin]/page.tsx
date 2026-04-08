import { HostGameClient } from "@/app/game/host/[pin]/host-game-client";
import { normalizeJoinPin } from "@/lib/game-logic";

type PageProps = { params: Promise<{ pin: string }> };

export default async function HostGamePage({ params }: PageProps) {
  const { pin: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const normalizedPin = normalizeJoinPin(decoded);

  if (normalizedPin == null) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-[var(--foreground)]/70">PIN invalid.</p>
      </div>
    );
  }

  return <HostGameClient normalizedPin={normalizedPin} />;
}
