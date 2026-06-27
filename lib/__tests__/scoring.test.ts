import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  DIMENSION_FLOOR,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
} from "../scoring";
import type { DynamicCriterion } from "../types";

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "",
  score,
  rationale: "",
  suggestion: "",
});

describe("clamp", () => {
  it("passes values already in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps negative numbers to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps numbers above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(74.4)).toBe(74);
    expect(clamp(74.5)).toBe(75);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number", () => {
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the single value unchanged", () => {
    expect(computeOverall([80])).toBe(80);
  });

  it("computes the mean and rounds", () => {
    expect(computeOverall([70, 80])).toBe(75);
    expect(computeOverall([70, 71])).toBe(71); // 70.5 → 71
  });
});

describe("isReady", () => {
  it("returns false for an empty scores array", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(90, [90, 90, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });

  it("returns true at the exact floor boundary", () => {
    expect(isReady(80, [80, 80, DIMENSION_FLOOR], 80)).toBe(true);
  });
});

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic scores", () => {
    const result = dimensionScores({
      clarity: { score: 90, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [makeDynamic("scope", 85)],
    });
    expect(result).toEqual([90, 70, 85]);
  });

  it("clamps each score", () => {
    const result = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    clarity: { score: 90, rationale: "clear", suggestion: "none" },
    conciseness: { score: 70, rationale: "ok", suggestion: "tighten" },
    dynamicCriteria: [makeDynamic("scope", 80)],
    refinedPrompt: "my idea",
    projectType: "web" as const,
    dynamicCriteriaSpecs: null,
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(Math.round((90 + 70 + 80) / 3));
  });

  it("sets ready=true when threshold is met and all floors clear", () => {
    const result = finalizeAssessment(
      {
        ...baseRaw,
        clarity: { ...baseRaw.clarity, score: 90 },
        conciseness: { ...baseRaw.conciseness, score: 80 },
        dynamicCriteria: [makeDynamic("scope", 80)],
      },
      80,
    );
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(
      {
        ...baseRaw,
        clarity: { ...baseRaw.clarity, score: 50 },
        conciseness: { ...baseRaw.conciseness, score: 50 },
        dynamicCriteria: [makeDynamic("scope", 50)],
      },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range raw scores", () => {
    const result = finalizeAssessment(
      {
        ...baseRaw,
        clarity: { ...baseRaw.clarity, score: 150 },
        conciseness: { ...baseRaw.conciseness, score: -10 },
        dynamicCriteria: [],
      },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specA = { key: "scope", label: "Scope", bestPractice: "" };
  const specB = { key: "mechanic", label: "Mechanic", bestPractice: "" };

  it("deduplicates items with the same key (keeps first occurrence)", () => {
    const items = [makeDynamic("scope", 80), makeDynamic("scope", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(80);
  });

  it("caps results to 3 when no prior spec is provided", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeDynamic(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to the prior spec order and labels", () => {
    const items = [makeDynamic("mechanic", 85), makeDynamic("scope", 75)];
    const result = normalizeDynamicCriteria(items, [specA, specB]);
    expect(result[0].key).toBe("scope");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("mechanic");
    expect(result[1].score).toBe(85);
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("preserves label from prior spec, not from the model response", () => {
    const modelItem = { ...makeDynamic("scope", 80), label: "model-label" };
    const result = normalizeDynamicCriteria([modelItem], [specA]);
    expect(result[0].label).toBe(specA.label);
  });
});
