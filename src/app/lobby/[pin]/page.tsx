import { cookies } from "next/headers";

import { LobbyClient } from "@/app/lobby/lobby-client";
import { normalizeJoinPin } from "@/lib/game-logic";
import {
  PLAYER_NICKNAME_COOKIE,
  PLAYER_SESSION_PIN_COOKIE,
} from "@/lib/player-storage";

type PageProps = {
  params: Promise<{ pin: string }>;
};

export default async function LobbyPage({ params }: PageProps) {
  const { pin: pinParam } = await params;
  const pinDecoded = decodeURIComponent(pinParam);
  const normalizedPin = normalizeJoinPin(pinDecoded);

  const cookieStore = await cookies();
  const nickname = cookieStore.get(PLAYER_NICKNAME_COOKIE)?.value ?? null;
  const cookiePin = cookieStore.get(PLAYER_SESSION_PIN_COOKIE)?.value ?? null;

  const pinMatches =
    cookiePin != null &&
    normalizedPin != null &&
    cookiePin === normalizedPin;

  const pinDisplay =
    normalizedPin ??
    (pinDecoded.trim().length > 0 ? pinDecoded.trim() : "—");

  return (
    <LobbyClient
      normalizedPin={normalizedPin}
      pinDisplay={pinDisplay}
      pinMatches={pinMatches}
      nickname={nickname}
    />
  );
}
