import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion } from "../types";

describe("clamp", () => {
  it("rounds to nearest integer within 0–100", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("floors values below 0", () => {
    expect(clamp(-10)).toBe(0);
  });

  it("caps values above 100", () => {
    expect(clamp(150)).toBe(100);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("hello" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the mean rounded to integer", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
    expect(computeOverall([75, 85])).toBe(80);
  });

  it("rounds correctly", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles single score", () => {
    expect(computeOverall([72])).toBe(72);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores meet the floor", () => {
    expect(isReady(85, [85, 90, 80], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 80, 80], 80)).toBe(false);
  });

  it(`returns false when any score is below DIMENSION_FLOOR (${DIMENSION_FLOOR})`, () => {
    expect(isReady(85, [85, 64, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "web app",
    refinedPrompt: "A web app that does X",
    clarity: { score: 85.7, rationale: "Clear", suggestion: "Even clearer" },
    conciseness: { score: 75, rationale: "OK", suggestion: "Tighter" },
    dynamicCriteria: [
      { key: "feasibility", label: "Feasibility", bestPractice: "...", score: 90.1, rationale: "Fine", suggestion: "" },
    ],
  };

  it("clamps all scores and computes overall", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(86);
    expect(result.conciseness.score).toBe(75);
    expect(result.dynamicCriteria[0].score).toBe(90);
    expect(result.overall).toBe(Math.round((86 + 75 + 90) / 3));
  });

  it("sets ready=true when conditions are met", () => {
    const high = {
      ...raw,
      clarity: { ...raw.clarity, score: 90 },
      conciseness: { ...raw.conciseness, score: 85 },
      dynamicCriteria: [{ ...raw.dynamicCriteria[0], score: 88 }],
    };
    const result = finalizeAssessment(high, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when a dimension is below the floor", () => {
    const low = {
      ...raw,
      clarity: { ...raw.clarity, score: 90 },
      conciseness: { ...raw.conciseness, score: 60 },
      dynamicCriteria: [{ ...raw.dynamicCriteria[0], score: 90 }],
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold onto the result", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const d1: DynamicCriterion = { key: "fun", label: "Fun", bestPractice: "...", score: 80, rationale: "r", suggestion: "s" };
  const d2: DynamicCriterion = { key: "reach", label: "Reach", bestPractice: "...", score: 70, rationale: "r", suggestion: "s" };

  it("deduplicates by key when no prior exists", () => {
    const result = normalizeDynamicCriteria([d1, d1, d2], null);
    expect(result.map((d) => d.key)).toEqual(["fun", "reach"]);
  });

  it("caps to 3 items on the first assessment", () => {
    const many = [d1, d2, { ...d1, key: "c" }, { ...d1, key: "d" }];
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("locks to prior spec keys when prior is provided", () => {
    const prior = [
      { key: "fun", label: "Fun", bestPractice: "..." },
      { key: "reach", label: "Reach", bestPractice: "..." },
    ];
    const result = normalizeDynamicCriteria([d1, d2], prior);
    expect(result.map((d) => d.key)).toEqual(["fun", "reach"]);
    expect(result[0].score).toBe(80);
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
