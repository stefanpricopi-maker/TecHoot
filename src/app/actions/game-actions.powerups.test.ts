import { describe, expect, it, vi } from "vitest";

import { ADMIN_SESSION_KEY_COOKIE, PLAYER_ID_COOKIE } from "@/lib/player-storage";

type DbSession = {
  id: string;
  pin: string;
  status: "lobby" | "question_active" | "showing_results" | "finished";
  quiz_id: string;
  current_question_index: number;
  current_question_started_at: string | null;
  question_count: number | null;
  question_seed: number | null;
  randomize_questions: boolean | null;
  admin_key: string;
};

type DbPlayer = {
  id: string;
  session_id: string;
  score: number;
  powerups: Record<string, number>;
  active_powerup: string | null;
  active_powerup_uses: number | null;
  active_powerup_question_index: number | null;
};

type DbQuestion = {
  id: string;
  quiz_id: string;
  prompt: string;
  options: string[];
  question_type?: "single" | "true_false" | "multi_select";
  correct_option_index: number;
  correct_option_indices?: number[] | null;
  order_index: number;
  time_limit_seconds: number | null;
};

type RoundResp = {
  id: string;
  session_id: string;
  player_id: string;
  question_index: number;
  selected_option_index: number | null;
  selected_option_indices?: number[];
  points_earned: number;
};

function makeSupabaseMock(db: {
  sessions: DbSession[];
  players: DbPlayer[];
  questions: DbQuestion[];
  round_responses: RoundResp[];
}) {
  type FilterValue = string | number | boolean | null;
  const state = {
    table: "" as string,
    filters: new Map<string, FilterValue>(),
    isNull: new Set<string>(),
    orderBy: null as null | { col: string; asc: boolean },
    selectCols: "" as string,
    mode: "select" as "select" | "update",
    updatePatch: null as Record<string, unknown> | null,
  };

  const api: any = {
    from(table: string) {
      state.table = table;
      state.filters = new Map();
      state.isNull = new Set();
      state.orderBy = null;
      state.selectCols = "";
      state.mode = "select";
      state.updatePatch = null;
      return api;
    },
    select(cols: string, _opts?: any) {
      state.mode = "select";
      state.selectCols = cols;
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
    order(col: string, opts: { ascending: boolean }) {
      state.orderBy = { col, asc: opts.ascending };
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
      if (!rows[0]) return { data: null, error: { message: "not found" } };
      return { data: rows[0], error: null };
    },
    async insert(payload: any) {
      if (state.table === "round_responses") {
        db.round_responses.push({
          ...(payload as any),
          id: payload.id ?? `rr_${db.round_responses.length + 1}`,
        });
        return { error: null };
      }
      return { error: null };
    },
    then(onFulfilled: any, onRejected: any) {
      if (state.mode === "update") {
        return Promise.resolve()
          .then(() => {
            if (state.table === "players") {
              const id = state.filters.get("id");
              const p = db.players.find((x) => x.id === id);
              if (p) Object.assign(p, state.updatePatch ?? {});
            }
            if (state.table === "sessions") {
              const id = state.filters.get("id");
              const s = db.sessions.find((x) => x.id === id);
              if (s) Object.assign(s, state.updatePatch ?? {});
            }
            if (state.table === "round_responses") {
              const id = state.filters.get("id");
              const r = db.round_responses.find((x) => x.id === id);
              if (r) Object.assign(r, state.updatePatch ?? {});
            }
            return onFulfilled({ data: null, error: null });
          })
          .catch(onRejected);
      }
      return api
        ._executeSelect()
        .then((rows: unknown[]) => onFulfilled({ data: rows, error: null }))
        .catch(onRejected);
    },
    async _executeSelect(): Promise<unknown[]> {
      const applyFilters = (rows: any[]) => {
        let out = [...rows];
        for (const [k, v] of state.filters.entries()) {
          out = out.filter((r) => r[k] === v);
        }
        for (const k of state.isNull.values()) {
          out = out.filter((r) => r[k] == null);
        }
        if (state.orderBy) {
          const { col, asc } = state.orderBy;
          out.sort((a, b) => ((a[col] ?? 0) - (b[col] ?? 0)) * (asc ? 1 : -1));
        }
        return out;
      };
      if (state.table === "sessions") return applyFilters(db.sessions).map((r) => ({ ...r }));
      if (state.table === "players") {
        const rows = applyFilters(db.players).map((r) => ({ ...r }));
        if (state.selectCols.includes("score") && !state.selectCols.includes("powerups")) {
          return rows.map((r) => ({ score: r.score }));
        }
        return rows;
      }
      if (state.table === "questions") {
        const rows = applyFilters(db.questions);
        return rows.map((r) => ({
          id: r.id,
          prompt: r.prompt,
          options: r.options,
          question_type: r.question_type ?? "single",
          correct_option_index: r.correct_option_index,
          correct_option_indices: r.correct_option_indices ?? null,
          time_limit_seconds: r.time_limit_seconds,
          order_index: r.order_index,
        }));
      }
      if (state.table === "round_responses") return applyFilters(db.round_responses).map((r) => ({ ...r }));
      return [];
    },
  };
  return api;
}

let supabaseForTest: any = null;
let cookiePlayerId: string | null = null;
let cookieAdminKey: string | null = null;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === PLAYER_ID_COOKIE && cookiePlayerId) return { value: cookiePlayerId };
      if (name === ADMIN_SESSION_KEY_COOKIE && cookieAdminKey) return { value: cookieAdminKey };
      return undefined;
    },
  }),
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdminClient: () => supabaseForTest,
  createSupabaseClient: () => supabaseForTest,
}));

describe("power-ups (integration-light)", () => {
  it("activatePowerUp consumes inventory and sets active", async () => {
    const sessionId = "11111111-1111-1111-1111-111111111111";
    const playerId = "22222222-2222-2222-2222-222222222222";
    const db = {
      sessions: [
        {
          id: sessionId,
          pin: "123456",
          status: "question_active",
          quiz_id: "qz1",
          current_question_index: 0,
          current_question_started_at: new Date().toISOString(),
          question_count: null,
          question_seed: 1,
          randomize_questions: false,
          admin_key: "k1",
        },
      ] satisfies DbSession[],
      players: [
        {
          id: playerId,
          session_id: sessionId,
          score: 0,
          powerups: { double_points: 1 },
          active_powerup: null,
          active_powerup_uses: null,
          active_powerup_question_index: null,
        },
      ] satisfies DbPlayer[],
      questions: [
        {
          id: "qa",
          quiz_id: "qz1",
          prompt: "Q",
          options: ["a", "b", "c", "d"],
          correct_option_index: 0,
          order_index: 0,
          time_limit_seconds: 30,
        },
      ] satisfies DbQuestion[],
      round_responses: [] satisfies RoundResp[],
    };
    supabaseForTest = makeSupabaseMock(db);
    cookiePlayerId = playerId;
    cookieAdminKey = null;

    const { activatePowerUp } = await import("./game-actions");
    const res = await activatePowerUp({
      pin: "123456",
      playerId,
      type: "double_points",
      questionIndex: 0,
    });
    expect(res.ok).toBe(true);
    expect(db.players[0]?.powerups.double_points).toBe(0);
    expect(db.players[0]?.active_powerup).toBe("double_points");
  });
});

