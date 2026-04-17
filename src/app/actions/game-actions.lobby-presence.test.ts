import { describe, expect, it, vi } from "vitest";

import { PLAYER_ID_COOKIE } from "@/lib/player-storage";

type DbSession = {
  id: string;
  status: "lobby" | "question_active" | "showing_results" | "finished";
};

type DbPlayer = {
  id: string;
  session_id: string;
  last_seen_at: string | null;
};

function makeSupabaseMock(db: { sessions: DbSession[]; players: DbPlayer[] }) {
  type FilterValue = string | number | boolean | null;
  const state = {
    table: "" as string,
    filters: new Map<string, FilterValue>(),
    mode: "select" as "select" | "update",
    updatePatch: null as Record<string, unknown> | null,
  };

  const api: any = {
    from(table: string) {
      state.table = table;
      state.filters = new Map();
      state.mode = "select";
      state.updatePatch = null;
      return api;
    },
    select(_cols: string) {
      state.mode = "select";
      return api;
    },
    eq(col: string, value: FilterValue) {
      state.filters.set(col, value);
      return api;
    },
    update(patch: Record<string, unknown>) {
      state.mode = "update";
      state.updatePatch = patch;
      return api;
    },
    async maybeSingle() {
      const rows = await api._executeSelect();
      return { data: rows[0] ?? null, error: null };
    },
    then(
      onFulfilled: (value: { data: unknown; error: null }) => unknown,
      onRejected: (reason: unknown) => unknown,
    ) {
      if (state.mode !== "update") {
        return api
          ._executeSelect()
          .then((rows: unknown[]) => onFulfilled({ data: rows, error: null }))
          .catch(onRejected);
      }
      return Promise.resolve()
        .then(() => {
          if (state.table === "players") {
            let rows = db.players;
            for (const [k, v] of state.filters.entries()) {
              rows = rows.filter((r: any) => (r as any)[k] === v);
            }
            for (const r of rows) Object.assign(r, state.updatePatch ?? {});
          }
          return onFulfilled({ data: null, error: null });
        })
        .catch(onRejected);
    },
    async _executeSelect(): Promise<unknown[]> {
      if (state.table === "players") {
        let rows = [...db.players];
        for (const [k, v] of state.filters.entries()) {
          rows = rows.filter((r: any) => (r as any)[k] === v);
        }
        return rows.map((r) => ({ ...r }));
      }
      if (state.table === "sessions") {
        let rows = [...db.sessions];
        for (const [k, v] of state.filters.entries()) {
          rows = rows.filter((r: any) => (r as any)[k] === v);
        }
        return rows.map((r) => ({ ...r }));
      }
      return [];
    },
  };

  return api;
}

let supabaseForTest: any = null;
let cookiePlayerId: string | null = null;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === PLAYER_ID_COOKIE && cookiePlayerId) return { value: cookiePlayerId };
      return undefined;
    },
  }),
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdminClient: () => supabaseForTest,
  createSupabaseClient: () => supabaseForTest,
}));

describe("pingLobbyPresence", () => {
  it("updates players.last_seen_at when session is lobby", async () => {
    const sessionId = "11111111-1111-1111-1111-111111111111";
    const db = {
      sessions: [{ id: sessionId, status: "lobby" }] satisfies DbSession[],
      players: [
        {
          id: "22222222-2222-2222-2222-222222222222",
          session_id: sessionId,
          last_seen_at: null,
        },
      ] satisfies DbPlayer[],
    };
    supabaseForTest = makeSupabaseMock(db);
    cookiePlayerId = "22222222-2222-2222-2222-222222222222";

    const { pingLobbyPresence } = await import("./game-actions");
    const res = await pingLobbyPresence();
    expect(res.ok).toBe(true);
    expect(db.players[0]?.last_seen_at).toMatch(/T/);
  });

  it("does not update when session is not lobby", async () => {
    const sessionId = "11111111-1111-1111-1111-111111111111";
    const db = {
      sessions: [{ id: sessionId, status: "question_active" }] satisfies DbSession[],
      players: [
        {
          id: "22222222-2222-2222-2222-222222222222",
          session_id: sessionId,
          last_seen_at: null,
        },
      ] satisfies DbPlayer[],
    };
    supabaseForTest = makeSupabaseMock(db);
    cookiePlayerId = "22222222-2222-2222-2222-222222222222";

    const { pingLobbyPresence } = await import("./game-actions");
    const res = await pingLobbyPresence();
    expect(res.ok).toBe(true);
    expect(db.players[0]?.last_seen_at).toBeNull();
  });
});

