import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "@/lib/types";

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps to 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(NaN)).toBe(0);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("averages scores and rounds", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
    expect(computeOverall([33, 34, 34])).toBe(34);
  });
});

describe("isReady", () => {
  it("requires overall >= threshold", () => {
    expect(isReady(80, [80, 80], 80)).toBe(true);
    expect(isReady(79, [80, 80], 80)).toBe(false);
  });

  it("requires all dimensions >= DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, DIMENSION_FLOOR - 1], 80)).toBe(false);
    expect(isReady(85, [85, DIMENSION_FLOOR], 80)).toBe(true);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: makeDim(80),
      conciseness: makeDim(70),
      dynamicCriteria: [makeDynamic("a", 90)],
    });
    expect(scores).toEqual([80, 70, 90]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: makeDim(110),
      conciseness: makeDim(-10),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "app",
    clarity: makeDim(85),
    conciseness: makeDim(75),
    dynamicCriteria: [makeDynamic("specificity", 80)],
    refinedPrompt: "A great idea",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(raw);
    expect(result.overall).toBe(Math.round((85 + 75 + 80) / 3));
  });

  it("sets ready=true when threshold crossed and all dims clear floor", () => {
    const result = finalizeAssessment(raw, 79);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when below threshold", () => {
    const result = finalizeAssessment(raw, 90);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(raw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps out-of-range raw scores", () => {
    const result = finalizeAssessment({
      ...raw,
      clarity: makeDim(150),
      conciseness: makeDim(-20),
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "a", label: "A", bestPractice: "bp-a" },
    { key: "b", label: "B", bestPractice: "bp-b" },
  ];

  it("deduplicates by key", () => {
    const dupes = [makeDynamic("a", 80), makeDynamic("a", 90)];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(80); // first one wins
  });

  it("caps first-time results to 3", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeDynamic(k, 80));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior spec order when prior is set", () => {
    const items = [makeDynamic("b", 70), makeDynamic("a", 90)];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(90);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(70);
  });

  it("preserves spec metadata from prior", () => {
    const items = [makeDynamic("a", 80)];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].label).toBe("A");
    expect(result[0].bestPractice).toBe("bp-a");
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
