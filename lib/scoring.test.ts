import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion } from "./types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("rounds to nearest integer", () => expect(clamp(73.6)).toBe(74));
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(120)).toBe(100));
  it("handles NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("averages scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds the mean", () => expect(computeOverall([67, 68])).toBe(68));
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("is ready when overall meets threshold and all scores clear the floor", () =>
    expect(isReady(85, [85, 90, 70], threshold)).toBe(true));

  it("is not ready when overall is below threshold", () =>
    expect(isReady(75, [75, 80, 70], threshold)).toBe(false));

  it("is not ready when one score falls below DIMENSION_FLOOR", () =>
    expect(isReady(85, [85, 90, DIMENSION_FLOOR - 1], threshold)).toBe(false));

  it("is not ready for empty scores", () =>
    expect(isReady(85, [], threshold)).toBe(false));

  it("passes at exact threshold and exact floor", () =>
    expect(isReady(threshold, [threshold, DIMENSION_FLOOR], threshold)).toBe(true));
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("collects all dimension scores in order", () => {
    const dynamic: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "", score: 70, rationale: "", suggestion: "" },
      { key: "b", label: "B", bestPractice: "", score: 80, rationale: "", suggestion: "" },
    ];
    expect(dimensionScores({
      clarity: { score: 90, rationale: "", suggestion: "" },
      conciseness: { score: 85, rationale: "", suggestion: "" },
      dynamicCriteria: dynamic,
    })).toEqual([90, 85, 70, 80]);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: { score: 90, rationale: "r", suggestion: "s" },
    conciseness: { score: 80, rationale: "r", suggestion: "s" },
    dynamicCriteria: [] as DynamicCriterion[],
    refinedPrompt: "build it",
  };

  it("computes overall as mean of dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(85);
  });

  it("sets ready=true when threshold is met and floor is cleared", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(
      { ...base, clarity: { ...base.clarity, score: 60 } },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing", () => {
    const result = finalizeAssessment(
      { ...base, clarity: { ...base.clarity, score: 150 } },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.overall).toBe(90);
  });

  it("stamps the active threshold on the result", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "novelty", label: "Novelty", bestPractice: "be novel", score: 72, rationale: "r", suggestion: "s" },
    { key: "market",  label: "Market",  bestPractice: "be wide",  score: 68, rationale: "r", suggestion: "s" },
    { key: "novelty", label: "Novelty", bestPractice: "be novel", score: 80, rationale: "dupe", suggestion: "" },
  ];

  it("deduplicates by key, keeping the first occurrence", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["novelty", "market"]);
    expect(result[0].score).toBe(72);
  });

  it("caps to 3 on the first assessment (no prior)", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`, label: `L${i}`, bestPractice: "", score: 70, rationale: "", suggestion: "",
    }));
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("locks to prior criteria order when prior is provided", () => {
    const prior = [
      { key: "market",  label: "Market",  bestPractice: "wide" },
      { key: "novelty", label: "Novelty", bestPractice: "novel" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["market", "novelty"]);
    expect(result[0].score).toBe(68);
    expect(result[1].score).toBe(72);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
