import { HostLobbyClient } from "./host-lobby-client";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HostLobbyPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const pin = typeof sp.pin === "string" ? sp.pin : "";
  const sessionId = typeof sp.sessionId === "string" ? sp.sessionId : "";
  return <HostLobbyClient pin={pin} sessionId={sessionId} />;
}

