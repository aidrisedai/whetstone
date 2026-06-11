import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "../lib/scoring";
import type { CriterionSpec, DynamicCriterion } from "../lib/types";

describe("clamp", () => {
  it("keeps values in 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
  it("clips values below 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });
  it("clips values above 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });
  it("rounds decimals", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });
  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("returns the single value for a single element array", () => {
    expect(computeOverall([75])).toBe(75);
  });
  it("returns the mean, rounded", () => {
    expect(computeOverall([70, 80])).toBe(75);
    expect(computeOverall([70, 80, 90])).toBe(80);
    expect(computeOverall([71, 72, 73])).toBe(72);
  });
  it("rounds toward nearest integer", () => {
    // 70+71+72+73 = 286 / 4 = 71.5 → rounds to 72
    expect(computeOverall([70, 71, 72, 73])).toBe(72);
  });
});

describe("isReady", () => {
  const threshold = DEFAULT_THRESHOLD; // 80

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], threshold)).toBe(false);
  });
  it("returns true when overall meets threshold and all dims meet floor", () => {
    expect(isReady(80, [80, 80, 80], threshold)).toBe(true);
    expect(isReady(95, [90, 85, 70], threshold)).toBe(true);
  });
  it("returns false when any dimension is below DIMENSION_FLOOR", () => {
    const justBelowFloor = DIMENSION_FLOOR - 1;
    expect(isReady(85, [90, 90, justBelowFloor], threshold)).toBe(false);
  });
  it("returns false for empty scores array", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });
  it("respects custom threshold", () => {
    expect(isReady(75, [75, 75, 75], 75)).toBe(true);
    expect(isReady(75, [75, 75, 75], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("extracts and clamps all scores", () => {
    const a = {
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 105, rationale: "", suggestion: "" }, // over 100 → clamped to 100
      dynamicCriteria: [
        { key: "k1", label: "L1", bestPractice: "bp1", score: -5, rationale: "", suggestion: "" },
      ],
    };
    expect(dimensionScores(a)).toEqual([80, 100, 0]);
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeDyn = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("dedupes by key, keeping first occurrence", () => {
    const items = [makeDyn("a", 70), makeDyn("a", 90), makeDyn("b", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result.find((d) => d.key === "a")?.score).toBe(70); // first wins
  });

  it("caps to 3 items on first assessment", () => {
    const items = [makeDyn("a", 70), makeDyn("b", 70), makeDyn("c", 70), makeDyn("d", 70)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior criteria order when provided", () => {
    const prior: CriterionSpec[] = [
      { key: "x", label: "X", bestPractice: "bp_x" },
      { key: "y", label: "Y", bestPractice: "bp_y" },
    ];
    const items = [makeDyn("y", 72), makeDyn("x", 88)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["x", "y"]);
    expect(result[0].score).toBe(88);
    expect(result[1].score).toBe(72);
  });

  it("uses prior spec labels/bestPractice, not model output", () => {
    const prior: CriterionSpec[] = [{ key: "k", label: "Correct Label", bestPractice: "bp" }];
    const items = [{ ...makeDyn("k", 77), label: "Wrong Label" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Correct Label");
  });

  it("handles empty items gracefully", () => {
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("falls back to positional match when a prior key is missing from items", () => {
    const prior: CriterionSpec[] = [
      { key: "missing", label: "Missing", bestPractice: "bp" },
    ];
    const items = [makeDyn("other", 55)]; // "missing" key not present
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("missing"); // spec key preserved
    expect(result[0].score).toBe(55); // score from positional fallback
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: { score: 80, rationale: "ok", suggestion: "improve" },
    conciseness: { score: 75, rationale: "ok", suggestion: "improve" },
    dynamicCriteria: [
      { key: "d1", label: "D1", bestPractice: "bp1", score: 85, rationale: "ok", suggestion: "x" },
    ],
    refinedPrompt: "Build it.",
  };

  it("clamps all scores, computes overall, sets threshold", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.clarity.score).toBe(80);
    expect(result.conciseness.score).toBe(75);
    expect(result.dynamicCriteria[0].score).toBe(85);
    // overall = mean(80, 75, 85) = 240/3 = 80
    expect(result.overall).toBe(80);
    expect(result.threshold).toBe(80);
  });

  it("sets ready=true when all gates pass", () => {
    // overall=80, all dims >= 65, threshold=80
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low = { ...base, clarity: { ...base.clarity, score: 50 } };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps over-limit scores before computing overall", () => {
    const over = { ...base, clarity: { ...base.clarity, score: 200 } };
    const result = finalizeAssessment(over);
    expect(result.clarity.score).toBe(100);
  });

  it("uses DEFAULT_THRESHOLD when none is provided", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});
