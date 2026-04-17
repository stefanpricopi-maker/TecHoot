import PartySocket from "partysocket";

export type LiveReactionMessage = {
  type: "reaction";
  emoji: string;
  ts: number;
};

export async function messageDataToString(raw: unknown): Promise<string | null> {
  if (typeof raw === "string") return raw;
  if (raw instanceof Blob) return await raw.text();
  if (raw instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(raw));
  }
  if (ArrayBuffer.isView(raw)) {
    return new TextDecoder().decode(raw as ArrayBufferView);
  }
  return null;
}

export function getPartyKitHost(): string {
  // PartySocket expects a host like "localhost:1999" (no protocol).
  const raw =
    process.env.NEXT_PUBLIC_PARTYKIT_HOST ??
    process.env.NEXT_PUBLIC_PARTYKIT_URL ??
    "";

  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return new URL(raw).host;
    }
  } catch {
    // ignore
  }

  if (raw) return raw;

  // Default for dev: match the current hostname (works for LAN devices).
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `${window.location.hostname}:1999`;
  }

  return "localhost:1999";
}

export function createGamePartySocket(opts: {
  pin: string;
  connectionId: string;
  party?: string;
}): PartySocket {
  return new PartySocket({
    host: getPartyKitHost(),
    room: `game-${opts.pin}`,
    id: opts.connectionId,
    party: opts.party,
  });
}

export function safeParseLiveReactionFromString(
  raw: string,
): LiveReactionMessage | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (o.type !== "reaction") return null;
    if (typeof o.emoji !== "string") return null;
    if (typeof o.ts !== "number") return null;
    return { type: "reaction", emoji: o.emoji, ts: o.ts };
  } catch {
    return null;
  }
}

