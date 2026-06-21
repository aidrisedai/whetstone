import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { Assessment, DynamicCriterion } from "@/lib/types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("returns the value when within 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-numbers", () => {
    // @ts-expect-error intentional bad input test
    expect(clamp("abc")).toBe(0);
    // @ts-expect-error intentional bad input test
    expect(clamp(undefined)).toBe(0);
  });

  it("rounds to the nearest integer", () => {
    expect(clamp(72.4)).toBe(72);
    expect(clamp(72.6)).toBe(73);
  });
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("averages a set of scores", () => {
    expect(computeOverall([80, 60, 100])).toBe(80);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([70, 71])).toBe(71);
  });

  it("handles a single-element array", () => {
    expect(computeOverall([42])).toBe(42);
  });
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  const dyn: DynamicCriterion[] = [
    { key: "a", label: "A", bestPractice: "bp", score: 70, rationale: "", suggestion: "" },
    { key: "b", label: "B", bestPractice: "bp", score: 85, rationale: "", suggestion: "" },
  ];

  it("collects clarity, conciseness, and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: { score: 90, rationale: "", suggestion: "" },
      conciseness: { score: 75, rationale: "", suggestion: "" },
      dynamicCriteria: dyn,
    });
    expect(scores).toEqual([90, 75, 70, 85]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR", () => {
    const belowFloor = DIMENSION_FLOOR - 1;
    expect(isReady(90, [90, 90, belowFloor], 80)).toBe(false);
  });

  it("returns false for an empty scores array", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "App",
    clarity: { score: 85, rationale: "clear", suggestion: "none" },
    conciseness: { score: 75, rationale: "ok", suggestion: "trim" },
    dynamicCriteria: [
      { key: "k1", label: "K1", bestPractice: "bp", score: 90, rationale: "", suggestion: "" },
    ],
    refinedPrompt: "A sharper idea.",
  };

  it("computes overall as the mean", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.overall).toBe(Math.round((85 + 75 + 90) / 3));
  });

  it("sets ready when threshold is cleared", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready to false when threshold is not met", () => {
    const lowBase = { ...base, clarity: { ...base.clarity, score: 50 } };
    const a = finalizeAssessment(lowBase, 80);
    expect(a.ready).toBe(false);
  });

  it("stamps the active threshold", () => {
    const a = finalizeAssessment(base, 90);
    expect(a.threshold).toBe(90);
  });

  it("clamps out-of-range scores", () => {
    const raw = {
      ...base,
      clarity: { ...base.clarity, score: 120 },
      conciseness: { ...base.conciseness, score: -5 },
    };
    const a = finalizeAssessment(raw, 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when no threshold argument is provided", () => {
    const a = finalizeAssessment(base);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "x", label: "X", bestPractice: "bpX", score: 70, rationale: "r", suggestion: "s" },
    { key: "y", label: "Y", bestPractice: "bpY", score: 80, rationale: "r", suggestion: "s" },
    { key: "z", label: "Z", bestPractice: "bpZ", score: 90, rationale: "r", suggestion: "s" },
    { key: "extra", label: "Extra", bestPractice: "bp", score: 60, rationale: "", suggestion: "" },
  ];

  it("caps first-pass to 3 criteria", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const dupe = [...items, { ...items[0] }];
    const result = normalizeDynamicCriteria(dupe, null);
    expect(result.filter((c) => c.key === "x")).toHaveLength(1);
  });

  it("locks to prior criteria on subsequent calls", () => {
    const prior = [
      { key: "x", label: "X", bestPractice: "bpX" },
      { key: "z", label: "Z", bestPractice: "bpZ" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("x");
    expect(result[1].key).toBe("z");
  });

  it("updates scores from the latest assessment when locked to prior", () => {
    const prior = [{ key: "x", label: "X", bestPractice: "bpX" }];
    const updated = [{ ...items[0], score: 99 }];
    const result = normalizeDynamicCriteria(updated, prior);
    expect(result[0].score).toBe(99);
  });

  it("handles null/undefined items gracefully", () => {
    // @ts-expect-error intentional bad input
    const result = normalizeDynamicCriteria(null, null);
    expect(result).toEqual([]);
  });
});
