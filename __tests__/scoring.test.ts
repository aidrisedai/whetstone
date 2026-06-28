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
} from "../lib/scoring";
import type { CriterionSpec, DynamicCriterion } from "../lib/types";

describe("clamp", () => {
  it("clamps values to 0-100", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(50)).toBe(50);
    expect(clamp(50.6)).toBe(51); // rounds
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("hello" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(computeOverall([67, 68])).toBe(68); // 67.5 rounds to 68
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall < threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });

  it("returns false when any score < DIMENSION_FLOOR (65)", () => {
    expect(isReady(85, [90, 90, 60], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("uses the threshold passed in, not hardcoded 80", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 75)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "a", score: 90, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([80, 70, 90]);
  });

  it("clamps each score", () => {
    const result = dimensionScores({
      clarity: { score: 110, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("normalizeDynamicCriteria", () => {
  const criteria: DynamicCriterion[] = [
    { key: "clarity", label: "Clarity", bestPractice: "be_clear", score: 75, rationale: "r", suggestion: "s" },
    { key: "audience", label: "Audience", bestPractice: "define_audience", score: 60, rationale: "r2", suggestion: "s2" },
  ];

  it("dedupes by key and caps at 3 on first assessment", () => {
    const duped = [...criteria, ...criteria]; // 4 items, 2 unique keys
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("clarity");
  });

  it("caps at 3 on first assessment", () => {
    const four: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "p", score: 50, rationale: "", suggestion: "" },
      { key: "b", label: "B", bestPractice: "p", score: 50, rationale: "", suggestion: "" },
      { key: "c", label: "C", bestPractice: "p", score: 50, rationale: "", suggestion: "" },
      { key: "d", label: "D", bestPractice: "p", score: 50, rationale: "", suggestion: "" },
    ];
    expect(normalizeDynamicCriteria(four, null)).toHaveLength(3);
  });

  it("locks to prior criteria order when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
      { key: "clarity", label: "Clarity", bestPractice: "be_clear" },
    ];
    const result = normalizeDynamicCriteria(criteria, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[1].key).toBe("clarity");
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Game",
    clarity: { score: 90, rationale: "clear", suggestion: "good" },
    conciseness: { score: 85, rationale: "tight", suggestion: "ok" },
    dynamicCriteria: [
      { key: "mechanic", label: "Core mechanic", bestPractice: "core_mechanic", score: 75, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "Build a fast paced game.",
  };

  it("computes overall from mean of clamped scores", () => {
    const result = finalizeAssessment(raw, 80);
    // scores: 90, 85, 75 → mean = 83.33 → 83
    expect(result.overall).toBe(83);
  });

  it("sets ready correctly", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true); // 83 >= 80, all >= 65
  });

  it("not ready when overall < threshold", () => {
    const lowRaw = { ...raw, clarity: { score: 50, rationale: "", suggestion: "" } };
    const result = finalizeAssessment(lowRaw, 80);
    expect(result.ready).toBe(false);
  });

  it("not ready when a dimension < floor", () => {
    const weakRaw = {
      ...raw,
      dynamicCriteria: [
        { key: "mechanic", label: "Core mechanic", bestPractice: "core_mechanic", score: 40, rationale: "", suggestion: "" },
      ],
    };
    const result = finalizeAssessment(weakRaw, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none given", () => {
    const result = finalizeAssessment(raw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
