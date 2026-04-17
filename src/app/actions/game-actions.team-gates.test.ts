import { describe, expect, it, vi } from "vitest";

import { ADMIN_SESSION_KEY_COOKIE } from "@/lib/player-storage";

type DbSession = {
  id: string;
  status: "lobby" | "question_active" | "showing_results" | "finished";
  quiz_id: string | null;
  admin_key: string;
  team_mode: boolean;
  current_question_started_at: string | null;
};

type DbPlayer = {
  id: string;
  session_id: string;
  team_id: string | null;
};

type DbQuestion = { id: string; quiz_id: string };

function makeSupabaseMock(db: {
  sessions: DbSession[];
  players: DbPlayer[];
  questions: DbQuestion[];
}) {
  type FilterValue = string | number | boolean | null;
  const state = {
    table: "" as string,
    filters: new Map<string, FilterValue>(),
    isNull: new Set<string>(),
    selectOpts: null as null | { count?: "exact"; head?: boolean },
    mode: "select" as "select" | "update",
    updatePatch: null as Record<string, unknown> | null,
  };

  const api: any = {
    from(table: string) {
      state.table = table;
      state.filters = new Map();
      state.isNull = new Set();
      state.selectOpts = null;
      state.mode = "select";
      state.updatePatch = null;
      return api;
    },
    select(_cols: string, opts?: { count?: "exact"; head?: boolean }) {
      state.mode = "select";
      state.selectOpts = opts ?? null;
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
    async single() {
      const rows = await api._executeSelect();
      return { data: rows[0] ?? null, error: rows[0] ? null : { message: "not found" } };
    },
    then(
      onFulfilled: (value: { data: unknown; error: null; count?: number | null }) => unknown,
      onRejected: (reason: unknown) => unknown,
    ) {
      if (state.mode !== "update") {
        return api
          ._executeSelect()
          .then((rows: unknown[]) => {
            const isCount = state.selectOpts?.head && state.selectOpts?.count === "exact";
            if (isCount) return onFulfilled({ data: null, error: null, count: rows.length });
            return onFulfilled({ data: rows, error: null });
          })
          .catch(onRejected);
      }
      return Promise.resolve()
        .then(() => {
          if (state.table === "sessions") {
            let rows = db.sessions;
            for (const [k, v] of state.filters.entries()) {
              rows = rows.filter((r: any) => (r as any)[k] === v);
            }
            for (const k of state.isNull.values()) {
              rows = rows.filter((r: any) => (r as any)[k] == null);
            }
            for (const r of rows) Object.assign(r, state.updatePatch ?? {});
          }
          return onFulfilled({ data: null, error: null });
        })
        .catch(onRejected);
    },
    async _executeSelect(): Promise<unknown[]> {
      if (state.table === "sessions") {
        let rows = [...db.sessions];
        for (const [k, v] of state.filters.entries()) {
          rows = rows.filter((r: any) => (r as any)[k] === v);
        }
        for (const k of state.isNull.values()) {
          rows = rows.filter((r: any) => (r as any)[k] == null);
        }
        return rows.map((r) => ({ ...r }));
      }
      if (state.table === "players") {
        let rows = [...db.players];
        for (const [k, v] of state.filters.entries()) {
          rows = rows.filter((r: any) => (r as any)[k] === v);
        }
        for (const k of state.isNull.values()) {
          rows = rows.filter((r: any) => (r as any)[k] == null);
        }
        return rows.map((r) => ({ ...r }));
      }
      if (state.table === "questions") {
        let rows = [...db.questions];
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
let cookieAdminKey: string | null = null;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === ADMIN_SESSION_KEY_COOKIE && cookieAdminKey) return { value: cookieAdminKey };
      return undefined;
    },
  }),
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdminClient: () => supabaseForTest,
  createSupabaseClient: () => supabaseForTest,
}));

describe("team gates (startGameAdmin / startCurrentQuestionTimer)", () => {
  it("startGameAdmin blocks when team_mode and someone has no team", async () => {
    const sessionId = "11111111-1111-1111-1111-111111111111";
    const db = {
      sessions: [
        {
          id: sessionId,
          status: "lobby",
          quiz_id: "qz1",
          admin_key: "k1",
          team_mode: true,
          current_question_started_at: null,
        },
      ] satisfies DbSession[],
      players: [
        { id: "p1", session_id: sessionId, team_id: null },
      ] satisfies DbPlayer[],
      questions: [{ id: "q1", quiz_id: "qz1" }] satisfies DbQuestion[],
    };
    supabaseForTest = makeSupabaseMock(db);
    cookieAdminKey = "k1";

    const { startGameAdmin } = await import("./game-actions");
    const res = await startGameAdmin(sessionId);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/fără echipă/i);
    expect(db.sessions[0]?.status).toBe("lobby");
  });

  it("startCurrentQuestionTimer blocks when team_mode and someone has no team", async () => {
    const sessionId = "11111111-1111-1111-1111-111111111111";
    const db = {
      sessions: [
        {
          id: sessionId,
          status: "question_active",
          quiz_id: "qz1",
          admin_key: "k1",
          team_mode: true,
          current_question_started_at: null,
        },
      ] satisfies DbSession[],
      players: [
        { id: "p1", session_id: sessionId, team_id: null },
      ] satisfies DbPlayer[],
      questions: [{ id: "q1", quiz_id: "qz1" }] satisfies DbQuestion[],
    };
    supabaseForTest = makeSupabaseMock(db);
    cookieAdminKey = "k1";

    const { startCurrentQuestionTimer } = await import("./game-actions");
    const res = await startCurrentQuestionTimer(sessionId);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/fără echipă/i);
    expect(db.sessions[0]?.current_question_started_at).toBeNull();
  });
});

