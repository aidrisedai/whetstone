import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion } from "./types";

describe("clamp", () => {
  it("returns 0 for negative values", () => expect(clamp(-5)).toBe(0));
  it("returns 100 for values above 100", () => expect(clamp(110)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.7)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles exact bounds", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores correctly", () => expect(computeOverall([80, 60])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([70, 71])).toBe(71));
});

describe("isReady", () => {
  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [79, 80], 80)).toBe(false));
  it("returns false when a dimension is below the floor", () =>
    expect(isReady(85, [85, 64], 80)).toBe(false));
  it("returns true when all conditions are met", () =>
    expect(isReady(80, [80, 70], 80)).toBe(true));
  it("returns false for empty scores", () => expect(isReady(100, [], 80)).toBe(false));
  it("uses DIMENSION_FLOOR constant correctly", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true));
});

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "some practice",
  score,
  rationale: "ok",
  suggestion: "improve",
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "app",
    clarity: { score: 85, rationale: "clear", suggestion: "none" },
    conciseness: { score: 75, rationale: "ok", suggestion: "shorter" },
    dynamicCriteria: [makeDynamic("feasibility", 90)],
    refinedPrompt: "Build a quiz app",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 90) / 3));
  });

  it("sets ready=true when threshold and floor are met", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when a dimension is below the floor", () => {
    const raw = {
      ...baseRaw,
      conciseness: { score: 60, rationale: "too long", suggestion: "trim" },
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold on the assessment", () => {
    const result = finalizeAssessment(baseRaw, 90);
    expect(result.threshold).toBe(90);
  });

  it("clamps out-of-range scores", () => {
    const raw = {
      ...baseRaw,
      clarity: { score: 150, rationale: "very clear", suggestion: "" },
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    makeDynamic("feasibility", 80),
    makeDynamic("originality", 70),
  ];

  it("returns up to 3 items on the first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(2);
    expect(result[0].key).toBe("feasibility");
  });

  it("locks to prior criteria order when prior is provided", () => {
    const prior = [
      { key: "originality", label: "Originality", bestPractice: "bp1" },
      { key: "feasibility", label: "Feasibility", bestPractice: "bp2" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("originality");
    expect(result[1].key).toBe("feasibility");
  });

  it("deduplicates by key", () => {
    const dupes = [makeDynamic("feasibility", 80), makeDynamic("feasibility", 90)];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result.filter((d) => d.key === "feasibility").length).toBe(1);
  });

  it("handles undefined/empty input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
