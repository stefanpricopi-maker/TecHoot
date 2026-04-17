import { describe, expect, it, vi } from "vitest";

import { seededShuffle } from "@/lib/seeded-shuffle";
import { PLAYER_ID_COOKIE } from "@/lib/player-storage";

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
};

type DbPlayer = { id: string; session_id: string; score: number };

type DbQuestion = {
  id: string;
  quiz_id: string;
  prompt: string;
  options: string[];
  question_type?: "single" | "true_false" | "multi_select";
  correct_option_indices?: number[] | null;
  correct_option_index: number;
  order_index: number;
  time_limit_seconds: number | null;
};

type InsertRoundResponse = {
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
  round_responses: InsertRoundResponse[];
}) {
  type FilterValue = string | number | boolean | null;
  type PlayerUpdatePatch = { score?: number };
  type RoundResponseUpdatePatch = {
    selected_option_index?: number | null;
    selected_option_indices?: number[];
    points_earned?: number;
    answered_at?: string;
  };

  const state = {
    table: "" as string,
    filters: new Map<string, FilterValue>(),
    orderBy: null as null | { col: string; asc: boolean },
    selectCols: "" as string,
    mode: "select" as "select" | "update",
    updatePatch: null as (PlayerUpdatePatch | RoundResponseUpdatePatch) | null,
  };

  const api = {
    from(table: string) {
      state.table = table;
      state.filters = new Map();
      state.orderBy = null;
      state.selectCols = "";
      return api;
    },
    select(cols: string, _opts?: unknown) {
      state.mode = "select";
      state.selectCols = cols;
      return api;
    },
    then(
      onFulfilled: (value: { data: unknown; error: null }) => unknown,
      onRejected: (reason: unknown) => unknown,
    ) {
      if (state.mode === "update") {
        return Promise.resolve()
          .then(async () => {
            if (state.table === "players") {
              const id = state.filters.get("id");
              const p = db.players.find((x) => x.id === id);
              const patch = state.updatePatch as PlayerUpdatePatch | null;
              if (p && patch && typeof patch.score === "number") {
                p.score = patch.score;
              }
            }
            if (state.table === "round_responses") {
              const id = state.filters.get("id");
              const r = db.round_responses.find((x) => x.id === id);
              if (r) {
                Object.assign(r, state.updatePatch ?? {});
              }
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
    eq(col: string, value: FilterValue) {
      state.filters.set(col, value);
      return api;
    },
    order(col: string, opts: { ascending: boolean }) {
      state.orderBy = { col, asc: opts.ascending };
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
    async insert(payload: unknown) {
      if (state.table === "round_responses") {
        const p = payload as Omit<InsertRoundResponse, "id"> & { id?: string };
        db.round_responses.push({
          ...(p as any),
          id:
            typeof p.id === "string" && p.id
              ? p.id
              : `rr_${db.round_responses.length + 1}`,
        } as InsertRoundResponse);
        return { error: null };
      }
      // used in tests only for round_responses
      return { error: null };
    },
    update(patch: PlayerUpdatePatch) {
      state.mode = "update";
      state.updatePatch = patch;
      return api;
    },
    async _executeSelect(): Promise<unknown[]> {
      if (state.table === "sessions") {
        let rows = [...db.sessions];
        for (const [k, v] of state.filters.entries()) {
          rows = rows.filter((r) => (r as unknown as Record<string, unknown>)[k] === v);
        }
        return rows.map((r) => ({ ...r }));
      }
      if (state.table === "players") {
        let rows = [...db.players];
        for (const [k, v] of state.filters.entries()) {
          rows = rows.filter((r) => (r as unknown as Record<string, unknown>)[k] === v);
        }
        // emulate select("score") etc.
        if (state.selectCols.includes("score")) {
          return rows.map((r) => ({ score: r.score }));
        }
        if (state.selectCols.includes("session_id")) {
          return rows.map((r) => ({ session_id: r.session_id }));
        }
        return rows.map((r) => ({ ...r }));
      }
      if (state.table === "questions") {
        let rows = [...db.questions];
        for (const [k, v] of state.filters.entries()) {
          rows = rows.filter((r) => (r as unknown as Record<string, unknown>)[k] === v);
        }
        if (state.orderBy) {
          const { col, asc } = state.orderBy;
          rows.sort((a, b) => {
            const av = (a as unknown as Record<string, unknown>)[col];
            const bv = (b as unknown as Record<string, unknown>)[col];
            const an = typeof av === "number" ? av : 0;
            const bn = typeof bv === "number" ? bv : 0;
            return (an - bn) * (asc ? 1 : -1);
          });
        }
        // return shape expected by fetchOrderedQuizQuestions
        return rows.map((r) => ({
          id: r.id,
          prompt: r.prompt,
          options: r.options,
          question_type: (r as any).question_type ?? "single",
          correct_option_index: r.correct_option_index,
          correct_option_indices: (r as any).correct_option_indices ?? null,
          time_limit_seconds: r.time_limit_seconds,
          order_index: r.order_index,
        }));
      }
      if (state.table === "round_responses") {
        let rows = [...db.round_responses] as unknown[];
        for (const [k, v] of state.filters.entries()) {
          rows = rows.filter((r) => (r as Record<string, unknown>)[k] === v);
        }
        return rows.map((r) => ({ ...(r as object) }));
      }
      return [];
    },
  };

  return api;
}

let supabaseForTest: any = null;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === PLAYER_ID_COOKIE) {
        return { value: "p1" };
      }
      return undefined;
    },
  }),
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseClient: () => supabaseForTest,
  createSupabaseAdminClient: () => supabaseForTest,
}));

describe("submitAnswer (integration-light)", () => {
  it("accepts answer when in time and question matches shuffled order", async () => {
    const db = {
      sessions: [
        {
          id: "s1",
          pin: "001234",
          status: "question_active",
          quiz_id: "qz1",
          current_question_index: 0,
          current_question_started_at: new Date(Date.now() - 1000).toISOString(),
          question_count: 10,
          question_seed: 123,
          randomize_questions: true,
        },
      ] as DbSession[],
      players: [{ id: "p1", session_id: "s1", score: 0 }] as DbPlayer[],
      questions: [
        {
          id: "qa",
          quiz_id: "qz1",
          prompt: "A?",
          options: ["x", "y", "z", "w"],
          correct_option_index: 1,
          order_index: 0,
          time_limit_seconds: 30,
        },
        {
          id: "qb",
          quiz_id: "qz1",
          prompt: "B?",
          options: ["x", "y", "z", "w"],
          correct_option_index: 2,
          order_index: 1,
          time_limit_seconds: 30,
        },
      ] as DbQuestion[],
      round_responses: [] as InsertRoundResponse[],
    };

    supabaseForTest = makeSupabaseMock(db);
    const { createSupabaseClient } = await import("@/lib/supabase");
    expect(createSupabaseClient()).toBe(supabaseForTest);
    const { submitAnswer } = await import("./game-actions");

    const sessProbe = await supabaseForTest
      .from("sessions")
      .select("id, status, pin")
      .eq("pin", "001234")
      .maybeSingle();
    expect(sessProbe.data?.status).toBe("question_active");

    // Compute the shuffled[0] question id to pass (matches UI)
    const shuffled = seededShuffle(
      db.questions.map((q) => ({
        id: q.id,
        text: q.prompt,
        options: q.options,
        correctAnswerIndex: q.correct_option_index,
        timeLimit: q.time_limit_seconds ?? 30,
      })),
      123,
    );
    const currentQuestionId = shuffled[0]!.id;

    const res = await submitAnswer("1234", "p1", currentQuestionId, 1);
    expect(res).toEqual({ ok: true });
    expect(db.round_responses).toHaveLength(1);
  });

  it("rejects answer after time limit", async () => {
    const db = {
      sessions: [
        {
          id: "s1",
          pin: "001234",
          status: "question_active",
          quiz_id: "qz1",
          current_question_index: 0,
          current_question_started_at: new Date(Date.now() - 60_000).toISOString(),
          question_count: 10,
          question_seed: 1,
          randomize_questions: false,
        },
      ] as DbSession[],
      players: [{ id: "p1", session_id: "s1", score: 0 }] as DbPlayer[],
      questions: [
        {
          id: "qa",
          quiz_id: "qz1",
          prompt: "A?",
          options: ["x", "y", "z", "w"],
          correct_option_index: 1,
          order_index: 0,
          time_limit_seconds: 1,
        },
      ] as DbQuestion[],
      round_responses: [] as InsertRoundResponse[],
    };

    supabaseForTest = makeSupabaseMock(db);
    const { submitAnswer } = await import("./game-actions");
    const res = await submitAnswer("1234", "p1", "qa", 1);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/expirat/i);
    }
    expect(db.round_responses).toHaveLength(0);
  });

  it("multi_select: partial scoring + clamp to 0", async () => {
    const db = {
      sessions: [
        {
          id: "s1",
          pin: "001234",
          status: "question_active",
          quiz_id: "qz1",
          current_question_index: 0,
          current_question_started_at: new Date(Date.now() - 1000).toISOString(),
          question_count: 10,
          question_seed: 1,
          randomize_questions: false,
        },
      ] as DbSession[],
      players: [{ id: "p1", session_id: "s1", score: 0 }] as DbPlayer[],
      questions: [
        {
          id: "qa",
          quiz_id: "qz1",
          prompt: "Selectează corecte",
          options: ["a", "b", "c", "d"],
          question_type: "multi_select",
          correct_option_indices: [0, 2],
          correct_option_index: 0,
          order_index: 0,
          time_limit_seconds: 30,
        },
      ] as DbQuestion[],
      round_responses: [] as InsertRoundResponse[],
    };

    supabaseForTest = makeSupabaseMock(db);
    const { submitAnswer } = await import("./game-actions");

    // 1 correct (0) and 1 wrong (1) => (1-1)/2 = 0 => clamp => 0 points, but stored.
    const res = await submitAnswer("1234", "p1", "qa", [0, 1]);
    expect(res).toEqual({ ok: true });
    expect(db.round_responses).toHaveLength(1);
    expect(db.round_responses[0]?.selected_option_indices).toEqual([0, 1]);
    expect(db.round_responses[0]?.points_earned).toBe(0);
    expect(db.players[0]?.score).toBe(0);

    // Change answer: select both correct => (2-0)/2 = 1 => >0 points.
    const res2 = await submitAnswer("1234", "p1", "qa", [0, 2]);
    expect(res2).toEqual({ ok: true });
    expect(db.round_responses).toHaveLength(1);
    expect(db.round_responses[0]?.selected_option_indices).toEqual([0, 2]);
    expect(db.round_responses[0]?.points_earned).toBeGreaterThan(0);
    expect(db.players[0]?.score).toBeGreaterThan(0);
  });
});

