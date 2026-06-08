import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "./scoring";
import type { DynamicCriterion } from "./types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("returns score unchanged when within 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps values below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
    expect(clamp(99.9)).toBe(100);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("hello" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the mean of a set of scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([70, 71])).toBe(71); // 141/2 = 70.5 → 71
    expect(computeOverall([70, 70, 71])).toBe(70); // 211/3 = 70.33 → 70
  });
});

describe("dimensionScores", () => {
  it("returns clarity, conciseness, then dynamic scores in order", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 60), dynDim("b", 50)],
    });
    expect(scores).toEqual([80, 70, 60, 50]);
  });

  it("clamps each dimension score", () => {
    const scores = dimensionScores({
      clarity: dim(200),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and every dimension clears the floor", () => {
    expect(isReady(80, [80, 75, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 75, 70], 80)).toBe(false);
  });

  it("returns false when a single dimension is below DIMENSION_FLOOR", () => {
    const belowFloor = DIMENSION_FLOOR - 1;
    expect(isReady(90, [90, 90, belowFloor], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 71)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  // All four dimensions average to 80, which just meets the default threshold.
  // Every dimension also clears DIMENSION_FLOOR (65).
  const baseRaw = {
    projectType: "Web app",
    clarity: dim(85),
    conciseness: dim(80),
    dynamicCriteria: [dynDim("audience", 80), dynDim("scope", 75)],
    refinedPrompt: "Build a thing.",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(Math.round((85 + 80 + 80 + 75) / 4));
  });

  it("sets ready=true when criteria are met", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(
      { ...baseRaw, clarity: dim(50), conciseness: dim(50), dynamicCriteria: [dynDim("a", 50)] },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores in the raw input", () => {
    const result = finalizeAssessment(
      { ...baseRaw, clarity: dim(150), conciseness: dim(-10) },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the active threshold on the result", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none is supplied", () => {
    const result = finalizeAssessment(baseRaw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs = [
    { key: "audience", label: "Audience", bestPractice: "define_audience" },
    { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
  ];

  it("deduplicates criteria by key (keeps first occurrence)", () => {
    const items = [dynDim("audience", 70), dynDim("audience", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on the first assessment (no prior)", () => {
    const items = [dynDim("a", 80), dynDim("b", 70), dynDim("c", 60), dynDim("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs when provided, pulling latest scores", () => {
    const items = [dynDim("audience", 82), dynDim("scope", 75)];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(82);
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(75);
  });

  it("preserves spec label and bestPractice from prior, not from model output", () => {
    const items = [{ ...dynDim("audience", 80), label: "Wrong Label", bestPractice: "wrong" }];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].label).toBe("Audience");
    expect(result[0].bestPractice).toBe("define_audience");
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("falls back to positional match when prior key not found in model output", () => {
    const items = [dynDim("other", 70)]; // no 'audience' or 'scope'
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].key).toBe("audience"); // spec key preserved
    expect(result[0].score).toBe(70); // score from positional fallback
    expect(result[1].score).toBe(0); // no match → 0
  });
});
