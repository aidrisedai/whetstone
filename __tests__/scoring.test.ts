import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { Assessment, DynamicCriterion } from "../lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynCrit = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds decimals", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through valid mid-range values", () => expect(clamp(55)).toBe(55));
});

describe("computeOverall", () => {
  it("averages scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds the mean", () => expect(computeOverall([67, 68])).toBe(68));
});

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic scores", () => {
    const result = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynCrit("audience", 90)],
    });
    expect(result).toEqual([70, 80, 90]);
  });

  it("clamps out-of-range values from model", () => {
    const result = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  const threshold = 80;

  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [75, 75, 75], threshold)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, 85, 60], threshold)).toBe(false);
  });

  it("returns true when overall >= threshold AND all dimensions >= floor", () => {
    expect(isReady(82, [82, 82, 82], threshold)).toBe(true);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Web app",
    clarity: dim(70),
    conciseness: dim(80),
    dynamicCriteria: [dynCrit("audience", 75)],
    refinedPrompt: "Build it.",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((70 + 80 + 75) / 3));
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(raw, 65);
    expect(result.threshold).toBe(65);
  });

  it("sets ready=true when threshold is crossed and all dimensions clear floor", () => {
    const highRaw = { ...raw, clarity: dim(90), conciseness: dim(90), dynamicCriteria: [dynCrit("a", 90)] };
    expect(finalizeAssessment(highRaw, 80).ready).toBe(true);
  });

  it("sets ready=false when any dimension is below DIMENSION_FLOOR", () => {
    const lowDyn = { ...raw, dynamicCriteria: [dynCrit("a", 50)] };
    expect(finalizeAssessment(lowDyn, 60).ready).toBe(false);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(raw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynCrit("audience", 70),
    dynCrit("success", 60),
    dynCrit("scope", 55),
  ];

  it("deduplicates by key", () => {
    const duped = [...items, dynCrit("audience", 80)];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result.filter((r) => r.key === "audience")).toHaveLength(1);
  });

  it("caps to 3 on first assessment", () => {
    const four = [...items, dynCrit("extra", 40)];
    expect(normalizeDynamicCriteria(four, null)).toHaveLength(3);
  });

  it("locks to prior criteria order when prior is provided", () => {
    const prior = items.map(({ key, label, bestPractice }) => ({ key, label, bestPractice }));
    const updated = [dynCrit("scope", 90), dynCrit("success", 85), dynCrit("audience", 75)];
    const result = normalizeDynamicCriteria(updated, prior);
    expect(result.map((r) => r.key)).toEqual(["audience", "success", "scope"]);
  });

  it("returns empty array for undefined input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("handles null/undefined items in the list", () => {
    const withNull = [null, dynCrit("a", 50), undefined] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(withNull, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD defaults to 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
