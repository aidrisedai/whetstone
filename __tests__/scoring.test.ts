import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("clamps values above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("clamps values below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("rounds to the nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("passes through a valid integer", () => expect(clamp(55)).toBe(55));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number input", () => expect(clamp("bad" as unknown as number)).toBe(0));
  it("clamps exactly at boundary 0", () => expect(clamp(0)).toBe(0));
  it("clamps exactly at boundary 100", () => expect(clamp(100)).toBe(100));
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns the mean of the scores", () => expect(computeOverall([60, 80, 100])).toBe(80));
  it("rounds to nearest integer", () => expect(computeOverall([33, 33, 34])).toBe(33));
  it("returns 0 for an empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value for a one-element array", () => expect(computeOverall([75])).toBe(75));
});

// ── dimensionScores ────────────────────────────────────────────────────────

const makeDynamic = (score: number): DynamicCriterion => ({
  key: "d",
  label: "D",
  bestPractice: "bp",
  score,
  rationale: "",
  suggestion: "",
});

describe("dimensionScores", () => {
  it("returns clamped scores for clarity + conciseness + dynamic criteria", () => {
    const result = dimensionScores({
      clarity: { score: 70, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: [makeDynamic(90)],
    });
    expect(result).toEqual([70, 80, 90]);
  });

  it("clamps out-of-range scores", () => {
    const result = dimensionScores({
      clarity: { score: -10, rationale: "", suggestion: "" },
      conciseness: { score: 200, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([0, 100]);
  });
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("returns true when overall meets threshold and all scores exceed the floor", () =>
    expect(isReady(85, [70, 80, 90], threshold)).toBe(true));

  it("returns false when overall is below threshold", () =>
    expect(isReady(75, [80, 80, 80], threshold)).toBe(false));

  it("returns false when a dimension falls below the floor", () =>
    expect(isReady(85, [DIMENSION_FLOOR - 1, 90, 90], threshold)).toBe(false));

  it("returns false for an empty scores array", () =>
    expect(isReady(90, [], threshold)).toBe(false));

  it("returns true when overall exactly equals the threshold", () =>
    expect(isReady(80, [70, 90, 80], threshold)).toBe(true));
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

const makeRaw = (overrides: Partial<{ clarityScore: number; concisenessScore: number; dynamicScore: number }> = {}) => ({
  projectType: "web-app",
  clarity: { score: overrides.clarityScore ?? 80, rationale: "r", suggestion: "s" },
  conciseness: { score: overrides.concisenessScore ?? 80, rationale: "r", suggestion: "s" },
  dynamicCriteria: [{ key: "k1", label: "L1", bestPractice: "bp1", score: overrides.dynamicScore ?? 80, rationale: "r", suggestion: "s" }],
  refinedPrompt: "Build a todo app",
});

describe("finalizeAssessment", () => {
  it("computes the correct overall average", () => {
    const result = finalizeAssessment(makeRaw({ clarityScore: 60, concisenessScore: 80, dynamicScore: 100 }), 80);
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when overall and floors are met", () => {
    const result = finalizeAssessment(makeRaw({ clarityScore: 90, concisenessScore: 90, dynamicScore: 90 }), 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(makeRaw({ clarityScore: 50, concisenessScore: 50, dynamicScore: 50 }), 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the correct threshold on the output", () => {
    const result = finalizeAssessment(makeRaw(), 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores from the model", () => {
    const result = finalizeAssessment(makeRaw({ clarityScore: 150, concisenessScore: -20, dynamicScore: 200 }), 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.dynamicCriteria[0].score).toBe(100);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

const makeDC = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: `bp-${key}`,
  score,
  rationale: "r",
  suggestion: "s",
});

const makeSpec = (key: string): CriterionSpec => ({
  key,
  label: key,
  bestPractice: `bp-${key}`,
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key keeping the first occurrence", () => {
    const result = normalizeDynamicCriteria([makeDC("a", 70), makeDC("a", 90), makeDC("b", 80)], null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 items when no prior criteria", () => {
    const items = [makeDC("a", 70), makeDC("b", 80), makeDC("c", 90), makeDC("d", 100)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks output keys to prior specs and matches scores by key", () => {
    const prior: CriterionSpec[] = [makeSpec("x"), makeSpec("y")];
    // Both x and y arrive with distinct scores — key matching must preserve them.
    const result = normalizeDynamicCriteria([makeDC("x", 70), makeDC("y", 88)], prior);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(70);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(88);
  });

  it("falls back to 0 when a prior key has no match and no positional fallback", () => {
    // prior has 3 specs but only 1 incoming item (score 70 for "a", not a prior key)
    // i=0 → positional fallback to deduped[0] (score 70); i=1,2 → no item → score 0
    const prior: CriterionSpec[] = [makeSpec("x"), makeSpec("y"), makeSpec("z")];
    const result = normalizeDynamicCriteria([makeDC("a", 70)], prior);
    expect(result[1].score).toBe(0);
    expect(result[2].score).toBe(0);
  });

  it("returns empty array when given undefined items and no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("clamps out-of-range scores from the model even with prior", () => {
    const prior: CriterionSpec[] = [makeSpec("a")];
    const result = normalizeDynamicCriteria([makeDC("a", 999)], prior);
    expect(result[0].score).toBe(100);
  });
});
