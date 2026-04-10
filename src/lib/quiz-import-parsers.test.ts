import { describe, expect, it } from "vitest";

import {
  parseBlockFormatText,
  parseCorrectCell,
  parseCsvLine,
  parseJsonExodShape,
  parseQuestionsCsv,
  validateQuizImportItemDraft,
} from "./quiz-import-parsers";

describe("parseCsvLine", () => {
  it("splits simple fields", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });
  it("handles quoted commas", () => {
    expect(parseCsvLine('"a,b",c')).toEqual(["a,b", "c"]);
  });
});

describe("parseCorrectCell", () => {
  it("accepts letters and indices", () => {
    expect(parseCorrectCell("b", 3)).toEqual({ ok: true, index: 1 });
    expect(parseCorrectCell("2", 4)).toEqual({ ok: true, index: 2 });
  });
});

describe("parseQuestionsCsv", () => {
  const sample = `quiz_title,prompt,option_a,option_b,option_c,option_d,correct
Întrebări Exod,Unu?,A,B,,,a
Altele,Doi?,X,Y,,,1`;

  it("filters by quiz title", () => {
    const { headerError, rows } = parseQuestionsCsv(sample, "Întrebări Exod");
    expect(headerError).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ok).toBe(true);
    if (rows[0]?.ok) {
      expect(rows[0].item.prompt).toBe("Unu?");
      expect(rows[0].item.options).toEqual(["A", "B"]);
    }
  });
});

describe("parseJsonExodShape", () => {
  it("maps question field", () => {
    const r = parseJsonExodShape(
      '[{"question":"Q?","options":["a","b"],"correct":1}]',
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.items[0]?.prompt).toBe("Q?");
      expect(r.items[0]?.correctOptionIndex).toBe(1);
    }
  });
});

describe("parseBlockFormatText", () => {
  it("parses a single block", () => {
    const text = `Ce e 2+2?
A) 3
B) 4
C) 5
Corect: B`;
    const { blocks } = parseBlockFormatText(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.ok).toBe(true);
    if (blocks[0]?.ok) {
      expect(blocks[0].item.options).toEqual(["3", "4", "5"]);
      expect(blocks[0].item.correctOptionIndex).toBe(1);
    }
  });
});

describe("validateQuizImportItemDraft", () => {
  it("rejects bad option count", () => {
    expect(
      validateQuizImportItemDraft({
        prompt: "x",
        options: ["a"],
        correctOptionIndex: 0,
      }),
    ).not.toBeNull();
  });
});
