import { redirect } from "next/navigation";

import { normalizeJoinPin } from "@/lib/game-logic";

type PageProps = { params: Promise<{ pin: string }> };

export default async function GameLegacyRedirect({ params }: PageProps) {
  const { pin: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const pin = normalizeJoinPin(decoded) ?? decoded.trim();
  redirect(`/game/player/${encodeURIComponent(pin)}`);
}
