import type * as Party from "partykit/server";

type ReactionIn = {
  type: "reaction";
  emoji: string;
  ts?: number;
};

type ReactionOut = {
  type: "reaction";
  emoji: string;
  ts: number;
};

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isReactionIn(v: unknown): v is ReactionIn {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.type !== "reaction") return false;
  if (typeof o.emoji !== "string") return false;
  if (o.emoji.length < 1 || o.emoji.length > 12) return false;
  return true;
}

export default class Server implements Party.Server {
  private room: Party.Room;
  private recentByConn: Map<string, number[]> = new Map();

  constructor(room: Party.Room) {
    this.room = room;
  }

  onClose(connection: Party.Connection) {
    this.recentByConn.delete(connection.id);
  }

  onMessage(message: string, sender: Party.Connection) {
    const parsed = safeJsonParse(message);
    if (!isReactionIn(parsed)) return;

    // Allow up to 6 reactions / 2s per connection.
    const now = Date.now();
    const windowMs = 2000;
    const limit = 6;
    const list = this.recentByConn.get(sender.id) ?? [];
    const pruned = list.filter((t) => now - t < windowMs);
    if (pruned.length >= limit) {
      this.recentByConn.set(sender.id, pruned);
      return;
    }
    pruned.push(now);
    this.recentByConn.set(sender.id, pruned);

    const out: ReactionOut = { type: "reaction", emoji: parsed.emoji, ts: now };
    this.room.broadcast(JSON.stringify(out));
  }
}

