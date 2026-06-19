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

// ── Shared fixtures ────────────────────────────────────────────────────────

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

const spec = (key: string): CriterionSpec => ({
  key,
  label: key,
  bestPractice: key,
});

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("returns the value unchanged when it is already in range", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("caps values above 100 at 100", () => {
    expect(clamp(150)).toBe(100);
    expect(clamp(Infinity)).toBe(100);
  });

  it("floors values below 0 at 0", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(-Infinity)).toBe(0);
  });

  it("rounds to the nearest integer", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("hello" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns the mean, rounded", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
  });

  it("rounds 0.5 up", () => {
    // 80 + 81 = 161 / 2 = 80.5 → 81
    expect(computeOverall([80, 81])).toBe(81);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles a single element", () => {
    expect(computeOverall([77])).toBe(77);
  });
});

// ── dimensionScores ────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("extracts and clamps clarity, conciseness, then dynamic criteria", () => {
    const result = dimensionScores({
      clarity: dim(90),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 80), dynDim("b", 110)],
    });
    expect(result).toEqual([90, 70, 80, 100]);
  });

  it("returns only fixed dimensions when there are no dynamic criteria", () => {
    const result = dimensionScores({
      clarity: dim(60),
      conciseness: dim(75),
      dynamicCriteria: [],
    });
    expect(result).toEqual([60, 75]);
  });
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(90, [70, 75, 80], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    const floor = DIMENSION_FLOOR;
    expect(isReady(80, [80, floor - 1, 80], 80)).toBe(false);
  });

  it("returns false for an empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(69, [70, 70, 70], 70)).toBe(false);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const rawBase = {
    projectType: "App",
    clarity: dim(85),
    conciseness: dim(80),
    dynamicCriteria: [dynDim("define_audience", 75)],
    refinedPrompt: "Build something",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(rawBase, 80);
    // scores: [85, 80, 75] → mean = 80
    expect(result.overall).toBe(80);
  });

  it("marks ready when overall meets threshold and all dims clear floor", () => {
    const result = finalizeAssessment(rawBase, 80);
    expect(result.ready).toBe(true);
  });

  it("marks not ready when overall is below threshold", () => {
    const low = {
      ...rawBase,
      clarity: dim(50),
      conciseness: dim(50),
      dynamicCriteria: [dynDim("define_audience", 50)],
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("marks not ready when one dimension is below the floor even if overall passes", () => {
    const borderline = {
      ...rawBase,
      clarity: dim(100),
      conciseness: dim(100),
      dynamicCriteria: [dynDim("define_audience", DIMENSION_FLOOR - 1)],
    };
    const result = finalizeAssessment(borderline, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const raw = {
      ...rawBase,
      clarity: dim(150),
      conciseness: dim(-10),
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the active threshold on the result", () => {
    expect(finalizeAssessment(rawBase, 70).threshold).toBe(70);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  it("returns up to 3 items on the first assessment (no prior)", () => {
    const items = [
      dynDim("a", 80),
      dynDim("b", 70),
      dynDim("c", 60),
      dynDim("d", 50),
    ];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("deduplicates by key, keeping the first occurrence", () => {
    const items = [dynDim("a", 80), dynDim("a", 90), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    const aEntry = result.find((d) => d.key === "a");
    expect(aEntry?.score).toBe(80);
  });

  it("locks to prior specs when provided", () => {
    const prior: CriterionSpec[] = [spec("a"), spec("b"), spec("c")];
    const items = [dynDim("a", 90), dynDim("b", 75), dynDim("c", 65), dynDim("d", 50)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["a", "b", "c"]);
    expect(result.find((d) => d.key === "d")).toBeUndefined();
  });

  it("maps updated scores from the model back to locked spec order", () => {
    const prior: CriterionSpec[] = [spec("x"), spec("y")];
    const items = [dynDim("y", 70), dynDim("x", 85)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(70);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(undefined, [spec("a")])).toHaveLength(1);
  });

  it("filters out items missing a key", () => {
    const items = [{ score: 80, rationale: "r", suggestion: "s" } as unknown as DynamicCriterion];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(0);
  });
});
