import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("keeps values in [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below zero to 0", () => {
    expect(clamp(-10)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(150)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(72.7)).toBe(73);
    expect(clamp(72.3)).toBe(72);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });
});

// ── computeOverall ────────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the single value for a one-element array", () => {
    expect(computeOverall([80])).toBe(80);
  });

  it("computes the mean, rounded", () => {
    expect(computeOverall([70, 80, 90])).toBe(80);
    expect(computeOverall([70, 71])).toBe(71);
  });
});

// ── isReady ───────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("is false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });

  it("is true when overall meets threshold and all scores ≥ floor", () => {
    expect(isReady(85, [85, 80, 90], 80)).toBe(true);
  });

  it("is false when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });

  it("is false when a score is below the floor even if overall passes", () => {
    const floor = DIMENSION_FLOOR;
    expect(isReady(85, [85, floor - 1, 90], 80)).toBe(false);
  });

  it("is true exactly at the threshold", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });

  it("is true exactly at the dimension floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR, 80], 80)).toBe(true);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

const baseRaw = {
  projectType: "Web app",
  clarity: { score: 85, rationale: "Clear", suggestion: "None" },
  conciseness: { score: 78, rationale: "Tight", suggestion: "None" },
  dynamicCriteria: [] as DynamicCriterion[],
  refinedPrompt: "Build it",
};

describe("finalizeAssessment", () => {
  it("clamps all scores to 0-100", () => {
    const a = finalizeAssessment({
      ...baseRaw,
      clarity: { score: 999, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
    });
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("computes overall as mean of all dimension scores", () => {
    const a = finalizeAssessment({ ...baseRaw, clarity: { score: 90, rationale: "", suggestion: "" }, conciseness: { score: 70, rationale: "", suggestion: "" } });
    expect(a.overall).toBe(80);
  });

  it("sets ready=true when threshold is met and all dimensions clear the floor", () => {
    const a = finalizeAssessment({ ...baseRaw, clarity: { score: 85, rationale: "", suggestion: "" }, conciseness: { score: 80, rationale: "", suggestion: "" } }, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const a = finalizeAssessment({ ...baseRaw, clarity: { score: 50, rationale: "", suggestion: "" }, conciseness: { score: 50, rationale: "", suggestion: "" } }, 80);
    expect(a.ready).toBe(false);
  });

  it("stamps the active threshold", () => {
    const a = finalizeAssessment(baseRaw, 75);
    expect(a.threshold).toBe(75);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

const makeCrit = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "ok",
  suggestion: "do better",
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key, keeping the first occurrence", () => {
    const input = [makeCrit("a", 70), makeCrit("a", 90), makeCrit("b", 80)];
    const result = normalizeDynamicCriteria(input, null);
    expect(result.filter((c) => c.key === "a")).toHaveLength(1);
    expect(result.find((c) => c.key === "a")!.score).toBe(70);
  });

  it("caps to 3 criteria when there is no prior set", () => {
    const input = [makeCrit("a", 70), makeCrit("b", 80), makeCrit("c", 60), makeCrit("d", 75)];
    const result = normalizeDynamicCriteria(input, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior spec order and updates scores from fresh input", () => {
    const prior: CriterionSpec[] = [
      { key: "x", label: "X", bestPractice: "x" },
      { key: "y", label: "Y", bestPractice: "y" },
    ];
    const fresh = [makeCrit("x", 88), makeCrit("y", 72)];
    const result = normalizeDynamicCriteria(fresh, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(88);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(72);
  });

  it("falls back positionally when a prior key is missing from fresh input", () => {
    const prior: CriterionSpec[] = [{ key: "missing", label: "M", bestPractice: "m" }];
    const fresh = [makeCrit("other", 55)];
    const result = normalizeDynamicCriteria(fresh, prior);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("missing");
    expect(result[0].score).toBe(55);
  });

  it("returns empty array for undefined input with no prior", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
