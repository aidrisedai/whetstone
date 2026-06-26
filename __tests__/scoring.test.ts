import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion } from "../lib/types";

describe("clamp", () => {
  it("clamps values to [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(72.7)).toBe(73);
    expect(clamp(72.3)).toBe(72);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns average of scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds correctly", () => {
    expect(computeOverall([60, 61])).toBe(61);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const a = {
      clarity: { score: 70, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "originality", label: "Originality", bestPractice: "", score: 90, rationale: "", suggestion: "" },
      ],
    };
    expect(dimensionScores(a)).toEqual([70, 80, 90]);
  });

  it("clamps each score", () => {
    const a = {
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    };
    expect(dimensionScores(a)).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  const threshold = 80;

  it("returns true when overall meets threshold and all scores above floor", () => {
    expect(isReady(85, [85, 70, 90], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [75, 80, 90], threshold)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, 60, 90], threshold)).toBe(false);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });

  it("returns true exactly at threshold with all scores at floor", () => {
    expect(isReady(threshold, [threshold, DIMENSION_FLOOR, DIMENSION_FLOOR], threshold)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    clarity: { score: 78, rationale: "good", suggestion: "be clearer" },
    conciseness: { score: 82, rationale: "tight", suggestion: "" },
    dynamicCriteria: [] as DynamicCriterion[],
    refinedPrompt: "Build a todo app",
    projectType: "web app",
    summary: "A todo list",
  };

  it("computes overall as mean of clamped dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(80); // (78+82)/2
  });

  it("stamps the threshold on the result", () => {
    expect(finalizeAssessment(base, 75).threshold).toBe(75);
  });

  it("sets ready=true when threshold met and all dimensions above floor", () => {
    const highScores = {
      ...base,
      clarity: { ...base.clarity, score: 85 },
      conciseness: { ...base.conciseness, score: 85 },
    };
    expect(finalizeAssessment(highScores, 80).ready).toBe(true);
  });

  it("sets ready=false when below threshold", () => {
    expect(finalizeAssessment(base, 85).ready).toBe(false);
  });

  it("clamps out-of-range model scores", () => {
    const wild = {
      ...base,
      clarity: { ...base.clarity, score: 200 },
      conciseness: { ...base.conciseness, score: -5 },
    };
    const result = finalizeAssessment(wild, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "originality", label: "Originality", bestPractice: "Be unique", score: 70, rationale: "OK", suggestion: "" },
    { key: "feasibility", label: "Feasibility", bestPractice: "Be realistic", score: 80, rationale: "Good", suggestion: "" },
  ];

  it("dedupes by key", () => {
    const duped = [...items, { ...items[0] }];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result.map((r) => r.key)).toEqual(["originality", "feasibility"]);
  });

  it("caps to 3 items on first assessment (no prior)", () => {
    const many: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: "",
      score: 60,
      rationale: "",
      suggestion: "",
    }));
    expect(normalizeDynamicCriteria(many, null).length).toBe(3);
  });

  it("locks to prior set when criteria are established", () => {
    const prior = [
      { key: "originality", label: "Originality", bestPractice: "Be unique" },
      { key: "feasibility", label: "Feasibility", bestPractice: "Be realistic" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["originality", "feasibility"]);
    expect(result[0].score).toBe(70);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters items missing a string key", () => {
    const bad = [{ key: 123 as unknown as string, label: "Bad", bestPractice: "", score: 50, rationale: "", suggestion: "" }];
    expect(normalizeDynamicCriteria(bad, null)).toEqual([]);
  });
});
