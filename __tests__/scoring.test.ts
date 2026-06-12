import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../lib/scoring";

describe("clamp", () => {
  it("clamps values above 100 to 100", () => {
    expect(clamp(120)).toBe(100);
  });

  it("clamps negative values to 0", () => {
    expect(clamp(-5)).toBe(0);
  });

  it("rounds fractional values", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number inputs", () => {
    // @ts-expect-error intentional bad input
    expect(clamp("bad")).toBe(0);
  });

  it("passes through valid in-range values", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });
});

describe("computeOverall", () => {
  it("returns the mean of scores", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 -> 71
  });

  it("handles single-element array", () => {
    expect(computeOverall([55])).toBe(55);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 70, 75, 65], 80)).toBe(true);
  });

  it("returns false when overall < threshold", () => {
    expect(isReady(79, [80, 70, 75, 65], 80)).toBe(false);
  });

  it("returns false when any score is below the floor", () => {
    expect(isReady(85, [90, 64, 90, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects the DIMENSION_FLOOR constant (65) exactly", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR, 80], 80)).toBe(true);
    expect(isReady(80, [80, DIMENSION_FLOOR - 1, 80], 80)).toBe(false);
  });
});

const makeDynamic = (key: string, score: number) => ({
  key,
  label: key,
  bestPractice: "do the thing",
  score,
  rationale: "fine",
  suggestion: "keep going",
});

describe("finalizeAssessment", () => {
  const rawBase = {
    projectType: "web app",
    clarity: { score: 85, rationale: "ok", suggestion: "good" },
    conciseness: { score: 75, rationale: "ok", suggestion: "good" },
    dynamicCriteria: [
      makeDynamic("define_audience", 90),
      makeDynamic("success_criteria", 70),
      makeDynamic("core_mechanic", 80),
    ],
    refinedPrompt: "Build an app",
  };

  it("computes correct overall as mean of all dimensions", () => {
    const result = finalizeAssessment(rawBase, 80);
    // scores: 85, 75, 90, 70, 80 → mean = 80
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when all dimensions clear the floor and overall >= threshold", () => {
    const result = finalizeAssessment(rawBase, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when a dimension is below the floor", () => {
    const raw: typeof rawBase = {
      ...rawBase,
      dynamicCriteria: [
        makeDynamic("define_audience", 90),
        makeDynamic("success_criteria", 60), // below 65 floor
        makeDynamic("core_mechanic", 80),
      ],
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const raw: typeof rawBase = {
      ...rawBase,
      clarity: { score: 150, rationale: "x", suggestion: "x" },
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
  });

  it("stamps the active threshold onto the result", () => {
    const result = finalizeAssessment(rawBase, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none is passed", () => {
    const result = finalizeAssessment(rawBase);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const spec = [
    { key: "alpha", label: "Alpha", bestPractice: "do alpha" },
    { key: "beta", label: "Beta", bestPractice: "do beta" },
  ];

  it("deduplicates repeated keys and takes the first occurrence", () => {
    const items = [
      makeDynamic("alpha", 80),
      makeDynamic("alpha", 99), // duplicate — should be ignored
      makeDynamic("beta", 70),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 items when no prior is set", () => {
    const items = [
      makeDynamic("a", 70),
      makeDynamic("b", 70),
      makeDynamic("c", 70),
      makeDynamic("d", 70),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks order and labels from prior spec when prior is provided", () => {
    const items = [
      makeDynamic("beta", 88),
      makeDynamic("alpha", 72),
    ];
    const result = normalizeDynamicCriteria(items, spec);
    expect(result[0].key).toBe("alpha");
    expect(result[0].label).toBe("Alpha");
    expect(result[0].score).toBe(72);
    expect(result[1].key).toBe("beta");
    expect(result[1].score).toBe(88);
  });

  it("returns empty array for undefined input", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("filters out malformed items lacking a key", () => {
    // @ts-expect-error intentional bad input
    const result = normalizeDynamicCriteria([{ score: 80 }, makeDynamic("valid", 70)], null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("valid");
  });
});
