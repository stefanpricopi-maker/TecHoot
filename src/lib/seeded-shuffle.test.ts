import { describe, expect, it } from "vitest";

import { hashStringToSeed, seededShuffle } from "./seeded-shuffle";

describe("seeded-shuffle", () => {
  it("hashStringToSeed is stable and non-zero", () => {
    const a = hashStringToSeed("pin-1234");
    const b = hashStringToSeed("pin-1234");
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
  });

  it("seededShuffle is deterministic for same seed", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const s1 = seededShuffle(arr, 123);
    const s2 = seededShuffle(arr, 123);
    expect(s1).toEqual(s2);
  });

  it("seededShuffle produces a permutation (same members)", () => {
    const arr = ["a", "b", "c", "d", "e", "f"];
    const out = seededShuffle(arr, 999);
    expect(out).toHaveLength(arr.length);
    expect([...out].sort()).toEqual([...arr].sort());
  });
});

