import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion } from "../lib/types";

describe("clamp", () => {
  it("clamps values within 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
    expect(clamp(100)).toBe(100);
    expect(clamp(0)).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([80, 70, 90])).toBe(80);
    expect(computeOverall([100, 0])).toBe(50);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([67, 68])).toBe(68);
  });
});

describe("dimensionScores", () => {
  it("includes fixed and dynamic scores", () => {
    const dynamic: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "", score: 70, rationale: "", suggestion: "" },
    ];
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 60, rationale: "", suggestion: "" },
      dynamicCriteria: dynamic,
    });
    expect(scores).toEqual([80, 60, 70]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    // overall passes but one dim is below floor (65)
    expect(isReady(80, [80, 80, 64], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("uses DEFAULT_THRESHOLD correctly", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
    expect(DIMENSION_FLOOR).toBe(65);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    clarity: { score: 80, rationale: "clear", suggestion: "ok" },
    conciseness: { score: 70, rationale: "concise", suggestion: "ok" },
    dynamicCriteria: [
      { key: "audience", label: "Audience", bestPractice: "...", score: 75, rationale: "", suggestion: "" },
    ],
    refinedPrompt: "Build a to-do app for teens",
    projectType: "Web app",
    lesson: "Clarity matters",
  };

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.overall).toBe(Math.round((80 + 70 + 75) / 3));
  });

  it("sets ready=true when overall >= threshold and all dims >= floor", () => {
    const highBase = {
      ...base,
      clarity: { ...base.clarity, score: 85 },
      conciseness: { ...base.conciseness, score: 85 },
      dynamicCriteria: [{ ...base.dynamicCriteria[0], score: 85 }],
    };
    const a = finalizeAssessment(highBase, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall < threshold", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.overall).toBeLessThan(80);
    expect(a.ready).toBe(false);
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(base, 75);
    expect(a.threshold).toBe(75);
  });

  it("clamps out-of-range raw scores", () => {
    const raw = {
      ...base,
      clarity: { ...base.clarity, score: 150 },
      conciseness: { ...base.conciseness, score: -10 },
    };
    const a = finalizeAssessment(raw, 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "audience", label: "Audience", bestPractice: "bp", score: 70, rationale: "r", suggestion: "s" },
    { key: "scope", label: "Scope", bestPractice: "bp", score: 65, rationale: "r", suggestion: "s" },
  ];

  it("deduplicates by key", () => {
    const duped = [...items, { ...items[0], score: 90 }];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 on first call (no prior)", () => {
    const many: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`, label: `L${i}`, bestPractice: "", score: 50, rationale: "", suggestion: "",
    }));
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("locks to prior criteria on subsequent calls", () => {
    const prior = [{ key: "audience", label: "Audience", bestPractice: "bp" }];
    const newItems: DynamicCriterion[] = [
      { key: "audience", label: "Audience", bestPractice: "bp", score: 85, rationale: "new", suggestion: "new" },
      { key: "extra", label: "Extra", bestPractice: "", score: 90, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(newItems, prior);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(85);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
