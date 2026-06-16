import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

// --- clamp ---

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("passes integers through unchanged", () => expect(clamp(50)).toBe(50));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-numbers", () => expect(clamp("x" as unknown as number)).toBe(0));
});

// --- computeOverall ---

describe("computeOverall", () => {
  it("averages scores correctly", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("handles a single score", () => expect(computeOverall([77])).toBe(77));
  it("rounds the mean", () => expect(computeOverall([80, 81])).toBe(81)); // 80.5 → 81
});

// --- dimensionScores ---

const makeDynamic = (score: number, n = 1): DynamicCriterion[] =>
  Array.from({ length: n }, (_, i) => ({
    key: `k${i}`,
    label: `L${i}`,
    bestPractice: "bp",
    score,
    rationale: "",
    suggestion: "",
  }));

describe("dimensionScores", () => {
  it("includes clarity + conciseness + dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: makeDynamic(60),
    });
    expect(scores).toEqual([80, 70, 60]);
  });

  it("clamps each dimension score", () => {
    const scores = dimensionScores({
      clarity: { score: 110, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// --- isReady ---

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(85, [85, 80, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [90, 90], 80)).toBe(false);
  });

  it("returns false when any score is below the dimension floor", () => {
    // DIMENSION_FLOOR = 65, one score at 60
    expect(isReady(85, [85, 60, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });

  it("uses the provided threshold, not the default", () => {
    expect(isReady(70, [80, 70], 70)).toBe(true);
    expect(isReady(70, [80, 70], 71)).toBe(false);
  });
});

// --- normalizeDynamicCriteria ---

const spec = (key: string) => ({ key, label: `${key}-label`, bestPractice: "bp" });
const crit = (key: string, score: number): DynamicCriterion => ({
  key,
  label: `${key}-label`,
  bestPractice: "bp",
  score,
  rationale: `r-${key}`,
  suggestion: `s-${key}`,
});

describe("normalizeDynamicCriteria", () => {
  it("returns empty list when no items and no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("deduplicates by key on first call (no prior)", () => {
    const items = [crit("a", 70), crit("a", 80), crit("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 on first call", () => {
    const items = [crit("a", 70), crit("b", 60), crit("c", 50), crit("d", 40)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks order and labels from prior on subsequent calls", () => {
    const prior = [spec("b"), spec("a")];
    const items = [crit("a", 90), crit("b", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(75);
    expect(result[1].score).toBe(90);
  });

  it("preserves prior spec labels over model-returned labels", () => {
    const prior = [spec("x")];
    const items = [{ ...crit("x", 55), label: "WRONG LABEL" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("x-label");
  });

  it("passes raw scores through unchanged (clamping is finalizeAssessment's job)", () => {
    const items = [crit("a", 120)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result[0].score).toBe(120);
  });
});

// --- finalizeAssessment ---

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: { score: 85, rationale: "good", suggestion: "" },
    conciseness: { score: 75, rationale: "ok", suggestion: "" },
    dynamicCriteria: [crit("feasibility", 80)],
    refinedPrompt: "Build a quiz app.",
  };

  it("computes overall as the mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    // (85 + 75 + 80) / 3 = 80
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when threshold is met and no dimension is below floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low = { ...base, clarity: { ...base.clarity, score: 50 } };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the active threshold on the result", () => {
    const result = finalizeAssessment(base, 90);
    expect(result.threshold).toBe(90);
  });

  it("uses DEFAULT_THRESHOLD when none supplied", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps out-of-range scores before computing", () => {
    const raw = {
      ...base,
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
      dynamicCriteria: [crit("k", 110)],
    };
    const result = finalizeAssessment(raw, 80);
    // (100 + 0 + 100) / 3 = 66.67 → 67
    expect(result.overall).toBe(67);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("exposes DIMENSION_FLOOR constant >= 0", () => {
    expect(DIMENSION_FLOOR).toBeGreaterThan(0);
    expect(DIMENSION_FLOOR).toBeLessThan(100);
  });
});
