import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "ok", suggestion: "ok" });
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "ok",
  suggestion: "ok",
});

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(105)).toBe(100));
  it("rounds to nearest int", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through valid values", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns mean of scores", () => expect(computeOverall([80, 60])).toBe(70));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds to nearest int", () => expect(computeOverall([80, 81])).toBe(81));
});

describe("isReady", () => {
  const threshold = 80;

  it("returns true when overall meets threshold and all scores clear the floor", () =>
    expect(isReady(80, [80, 80, 80], threshold)).toBe(true));

  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [90, 90, 90], threshold)).toBe(false));

  it("returns false when one score falls below the dimension floor", () =>
    expect(isReady(85, [90, 90, 60], threshold)).toBe(false));

  it("returns false for empty scores", () =>
    expect(isReady(90, [], threshold)).toBe(false));

  it("floor boundary: exactly DIMENSION_FLOOR passes", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR], threshold)).toBe(true));

  it("floor boundary: one below DIMENSION_FLOOR fails", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR - 1], threshold)).toBe(false));
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: dim(90),
    conciseness: dim(85),
    dynamicCriteria: [dynDim("scope", 80)],
    refinedPrompt: "A thing",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    // mean of 90, 85, 80 = 255/3 = 85
    expect(result.overall).toBe(85);
  });

  it("sets ready=true when all conditions are met", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low = { ...base, clarity: dim(50), conciseness: dim(50), dynamicCriteria: [dynDim("scope", 50)] };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps raw scores from the model", () => {
    const raw = { ...base, clarity: dim(150), conciseness: dim(-10) };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("clarity", 80),
    dynDim("scope", 70),
    dynDim("audience", 60),
    dynDim("extra", 55),
  ];

  it("caps to 3 on the first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const duped = [...items, dynDim("clarity", 90)];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result.filter((d) => d.key === "clarity")).toHaveLength(1);
  });

  it("locks to prior spec order when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "audience" },
      { key: "scope", label: "Scope", bestPractice: "scope" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[1].key).toBe("scope");
  });

  it("returns empty array for undefined input", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toHaveLength(0);
  });
});
