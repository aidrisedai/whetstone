import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.7)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("abc" as unknown as number)).toBe(0));
  it("passes through valid mid-range value", () => expect(clamp(55)).toBe(55));
});

// ── computeOverall ─────────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value", () => expect(computeOverall([80])).toBe(80));
  it("averages two values", () => expect(computeOverall([70, 90])).toBe(80));
  it("rounds the mean", () => expect(computeOverall([70, 71])).toBe(71));
});

// ── isReady ───────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns false when overall is below threshold", () => expect(isReady(79, [80, 80], 80)).toBe(false));
  it("returns false when a dimension is below the floor", () => {
    expect(isReady(85, [90, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
  it("returns true when overall meets threshold and all dimensions meet floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true);
  });
  it("returns true well above threshold", () => {
    expect(isReady(95, [90, 90, 90], 80)).toBe(true);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

const baseDim = { score: 80, rationale: "good", suggestion: "n/a" };
const baseInput = {
  projectType: "game",
  clarity: { ...baseDim, score: 80 },
  conciseness: { ...baseDim, score: 70 },
  dynamicCriteria: [] as DynamicCriterion[],
  refinedPrompt: "Build a game",
};

describe("finalizeAssessment", () => {
  it("computes overall as the mean of clarity + conciseness", () => {
    const result = finalizeAssessment(baseInput, 80);
    expect(result.overall).toBe(75);
  });

  it("stamps the threshold onto the result", () => {
    const result = finalizeAssessment(baseInput, 90);
    expect(result.threshold).toBe(90);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(baseInput, 80);
    expect(result.ready).toBe(false);
  });

  it("sets ready=true when overall meets threshold and all dimensions meet floor", () => {
    const input = {
      ...baseInput,
      clarity: { ...baseDim, score: 85 },
      conciseness: { ...baseDim, score: 85 },
    };
    const result = finalizeAssessment(input, 80);
    expect(result.ready).toBe(true);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const input = {
      ...baseInput,
      clarity: { ...baseDim, score: 200 },
      conciseness: { ...baseDim, score: -10 },
    };
    const result = finalizeAssessment(input, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(50);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

const makeSpec = (key: string): CriterionSpec => ({
  key,
  label: key,
  bestPractice: key,
});

describe("normalizeDynamicCriteria", () => {
  it("returns empty array for undefined input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("deduplicates items by key (first-seen wins)", () => {
    const items = [makeDynamic("foo", 70), makeDynamic("foo", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 items when no prior criteria", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeDynamic(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria order and pulls latest scores", () => {
    const prior = [makeSpec("x"), makeSpec("y")];
    const items = [makeDynamic("y", 80), makeDynamic("x", 60)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["x", "y"]);
    expect(result[0].score).toBe(60);
    expect(result[1].score).toBe(80);
  });

  it("uses fallback score of 0 when prior key has no matching item", () => {
    const prior = [makeSpec("missing")];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].key).toBe("missing");
    expect(result[0].score).toBe(0);
  });
});
