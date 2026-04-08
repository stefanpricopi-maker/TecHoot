import { describe, expect, it } from "vitest";

import { clampQuestionLimit } from "./question-limit";

describe("clampQuestionLimit", () => {
  it("returns total when sessionQuestionCount is null/undefined", () => {
    expect(clampQuestionLimit(50, null)).toBe(50);
    expect(clampQuestionLimit(50, undefined)).toBe(50);
  });

  it("clamps to [0,total] and floors", () => {
    expect(clampQuestionLimit(10, 3)).toBe(3);
    expect(clampQuestionLimit(10, 3.9)).toBe(3);
    expect(clampQuestionLimit(10, 999)).toBe(10);
  });

  it("treats non-positive as no limit", () => {
    expect(clampQuestionLimit(10, 0)).toBe(10);
    expect(clampQuestionLimit(10, -5)).toBe(10);
  });
});

