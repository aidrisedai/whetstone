import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

describe("clamp", () => {
  it("returns the value when in range", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(-1)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
    expect(clamp(99.9)).toBe(100);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number", () => {
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0, 0, 0])).toBe(0);
  });

  it("rounds fractional means", () => {
    expect(computeOverall([80, 81])).toBe(81);
    expect(computeOverall([0, 1])).toBe(1);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles single score", () => {
    expect(computeOverall([72])).toBe(72);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 70, 65], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(90, [90, 90, 64], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 75)).toBe(false);
  });

  it("returns true at exactly the floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "app",
    clarity: { score: 85, rationale: "Good", suggestion: "Better" },
    conciseness: { score: 75, rationale: "Ok", suggestion: "Tighter" },
    dynamicCriteria: [
      { key: "feasibility", label: "Feasibility", bestPractice: "bp", score: 70, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "Build a todo app",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 70) / 3));
  });

  it("sets ready=true when threshold and floor are met", () => {
    const raw = {
      ...baseRaw,
      clarity: { ...baseRaw.clarity, score: 85 },
      conciseness: { ...baseRaw.conciseness, score: 80 },
      dynamicCriteria: [{ ...baseRaw.dynamicCriteria[0], score: 80 }],
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when a dimension is below floor", () => {
    const raw = {
      ...baseRaw,
      clarity: { ...baseRaw.clarity, score: 90 },
      conciseness: { ...baseRaw.conciseness, score: 90 },
      dynamicCriteria: [{ ...baseRaw.dynamicCriteria[0], score: 60 }],
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const raw = {
      ...baseRaw,
      clarity: { ...baseRaw.clarity, score: 120 },
      conciseness: { ...baseRaw.conciseness, score: -5 },
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(baseRaw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const crit = (key: string, score = 70): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: "bp",
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("dedupes by key on first assessment (no prior)", () => {
    const items = [crit("a"), crit("a"), crit("b")];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
  });

  it("caps to 3 on first assessment", () => {
    const items = [crit("a"), crit("b"), crit("c"), crit("d")];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior spec order and keys", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "Alpha", bestPractice: "bp1" },
      { key: "b", label: "Beta", bestPractice: "bp2" },
    ];
    const items = [crit("b", 80), crit("a", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(90);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(80);
  });

  it("uses prior label and bestPractice (not model's)", () => {
    const prior: CriterionSpec[] = [{ key: "a", label: "Locked Label", bestPractice: "Locked BP" }];
    const items = [{ ...crit("a"), label: "Model Label", bestPractice: "Model BP" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Locked Label");
    expect(result[0].bestPractice).toBe("Locked BP");
  });

  it("returns empty array for undefined input with no prior", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("fills missing keys from deduped list when prior key not found in items", () => {
    const prior: CriterionSpec[] = [{ key: "a", label: "Alpha", bestPractice: "bp" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(0);
  });
});
