import { describe, expect, it, vi } from "vitest";

import { ADMIN_SESSION_KEY_COOKIE } from "@/lib/player-storage";

type DbSession = {
  id: string;
  pin: string;
  status: "lobby" | "question_active" | "showing_results" | "finished";
  admin_key: string;
  results_published_at: string | null;
  ended_at: string | null;
};

type DbPlayer = {
  id: string;
  session_id: string;
  display_name: string;
};

function makeSupabaseMock(db: { sessions: DbSession[]; players: DbPlayer[] }) {
  type FilterValue = string | number | boolean | null;
  const state = {
    table: "" as string,
    filters: new Map<string, FilterValue>(),
    isNull: new Set<string>(),
    mode: "select" as "select" | "update",
    updatePatch: null as Record<string, unknown> | null,
  };

  const api: any = {
    from(table: string) {
      state.table = table;
      state.filters = new Map();
      state.isNull = new Set();
      state.mode = "select";
      state.updatePatch = null;
      return api;
    },
    select(_cols: string, _opts?: unknown) {
      state.mode = "select";
      return api;
    },
    eq(col: string, value: FilterValue) {
      state.filters.set(col, value);
      return api;
    },
    is(col: string, value: null) {
      if (value === null) state.isNull.add(col);
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
    async _executeSelect(): Promise<unknown[]> {
      if (state.table === "sessions") {
        let rows = [...db.sessions];
        for (const [k, v] of state.filters.entries()) {
          rows = rows.filter((r: any) => r[k] === v);
        }
        for (const k of state.isNull.values()) {
          rows = rows.filter((r: any) => r[k] == null);
        }
        return rows.map((r) => ({ ...r }));
      }
      if (state.table === "players") {
        let rows = [...db.players];
        for (const [k, v] of state.filters.entries()) {
          rows = rows.filter((r: any) => r[k] === v);
        }
        return rows.map((r) => ({ ...r }));
      }
      return [];
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
          if (state.table === "sessions") {
            let rows = db.sessions;
            for (const [k, v] of state.filters.entries()) {
              rows = rows.filter((r: any) => r[k] === v);
            }
            for (const k of state.isNull.values()) {
              rows = rows.filter((r: any) => r[k] == null);
            }
            for (const r of rows) {
              Object.assign(r, state.updatePatch ?? {});
            }
          }
          return onFulfilled({ data: null, error: null });
        })
        .catch(onRejected);
    },
  };

  return api;
}

let supabaseForTest: any = null;
let cookieAdminKey: string | null = null;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === ADMIN_SESSION_KEY_COOKIE && cookieAdminKey) {
        return { value: cookieAdminKey };
      }
      return undefined;
    },
  }),
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdminClient: () => supabaseForTest,
  createSupabaseClient: () => supabaseForTest,
}));

describe("results publish gate", () => {
  const P1 = "11111111-1111-1111-1111-111111111111";

  it("publishFinalResults sets results_published_at only when finished", async () => {
    const db = {
      sessions: [
        {
          id: "s1",
          pin: "123456",
          status: "finished",
          admin_key: "k1",
          results_published_at: null,
          ended_at: new Date().toISOString(),
        },
      ] satisfies DbSession[],
      players: [] satisfies DbPlayer[],
    };
    supabaseForTest = makeSupabaseMock(db);
    cookieAdminKey = "k1";

    const { publishFinalResults } = await import("./game-actions");
    const res = await publishFinalResults("s1");
    expect(res.ok).toBe(true);
    expect(db.sessions[0]?.results_published_at).toMatch(/T/);
  });

  it("publishFinalResults rejects when missing admin cookie", async () => {
    const db = {
      sessions: [
        {
          id: "s1",
          pin: "123456",
          status: "finished",
          admin_key: "k1",
          results_published_at: null,
          ended_at: new Date().toISOString(),
        },
      ] satisfies DbSession[],
      players: [] satisfies DbPlayer[],
    };
    supabaseForTest = makeSupabaseMock(db);
    cookieAdminKey = null;

    const { publishFinalResults } = await import("./game-actions");
    const res = await publishFinalResults("s1");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Neautorizat/);
    expect(db.sessions[0]?.results_published_at).toBeNull();
  });

  it("resolveResumeRoute routes finished-but-unpublished back to player screen", async () => {
    const db = {
      sessions: [
        {
          id: "s1",
          pin: "123456",
          status: "finished",
          admin_key: "k1",
          results_published_at: null,
          ended_at: new Date().toISOString(),
        },
      ] satisfies DbSession[],
      players: [
        { id: P1, session_id: "s1", display_name: "N1" },
      ] satisfies DbPlayer[],
    };
    supabaseForTest = makeSupabaseMock(db);
    cookieAdminKey = null;

    const { resolveResumeRoute } = await import("./game-actions");
    const res = await resolveResumeRoute({
      pin: "123456",
      playerId: P1,
      nickname: "N1",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.route).toBe("/game/player/123456");
    }
  });

  it("resolveResumeRoute routes finished-and-published to results", async () => {
    const db = {
      sessions: [
        {
          id: "s1",
          pin: "123456",
          status: "finished",
          admin_key: "k1",
          results_published_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
        },
      ] satisfies DbSession[],
      players: [
        { id: P1, session_id: "s1", display_name: "N1" },
      ] satisfies DbPlayer[],
    };
    supabaseForTest = makeSupabaseMock(db);
    cookieAdminKey = null;

    const { resolveResumeRoute } = await import("./game-actions");
    const res = await resolveResumeRoute({
      pin: "123456",
      playerId: P1,
      nickname: "N1",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.route).toBe("/game/results/123456");
    }
  });
});

