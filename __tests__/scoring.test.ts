import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

describe("clamp", () => {
  it("passes through values in range", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(72.4)).toBe(72);
    expect(clamp(72.6)).toBe(73);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("rounds fractional means", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 rounds to 71
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  const threshold = 80;

  it("returns true when overall meets threshold and all dims above floor", () => {
    expect(isReady(80, [80, 80, 80], threshold)).toBe(true);
    expect(isReady(95, [70, 85, 90], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], threshold)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR (65)", () => {
    expect(isReady(85, [85, 85, 64], threshold)).toBe(false);
    expect(isReady(85, [85, 85, 65], threshold)).toBe(true); // exactly at floor is ok
  });

  it("returns false for empty scores array", () => {
    expect(isReady(85, [], threshold)).toBe(false);
  });

  it("one strong score cannot carry a weak idea", () => {
    // High overall but a lagging dimension blocks export
    expect(isReady(82, [100, 100, 47], threshold)).toBe(false);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("defaults to 80 when env var is unset", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Game",
    clarity: { score: 85, rationale: "Clear", suggestion: "" },
    conciseness: { score: 78, rationale: "Ok", suggestion: "" },
    dynamicCriteria: [
      { key: "creativity", label: "Creativity", bestPractice: "", score: 90, rationale: "", suggestion: "" },
    ],
    refinedPrompt: "Build a fun quiz game",
  };

  it("computes correct overall", () => {
    const result = finalizeAssessment(base);
    // scores: [85, 78, 90] → mean = 84.33 → rounds to 84
    expect(result.overall).toBe(84);
  });

  it("marks ready when threshold is met and all dims above floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("marks not ready when overall below threshold", () => {
    const result = finalizeAssessment(base, 90);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores from model", () => {
    const raw = {
      ...base,
      clarity: { ...base.clarity, score: 150 },
      conciseness: { ...base.conciseness, score: -5 },
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold on the result", () => {
    expect(finalizeAssessment(base, 75).threshold).toBe(75);
    expect(finalizeAssessment(base, 90).threshold).toBe(90);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "fun", label: "Fun", bestPractice: "Make it fun", score: 80, rationale: "Good", suggestion: "" },
    { key: "scope", label: "Scope", bestPractice: "Keep it small", score: 70, rationale: "Ok", suggestion: "" },
    { key: "tech", label: "Tech", bestPractice: "Simple stack", score: 90, rationale: "Great", suggestion: "" },
    { key: "extra", label: "Extra", bestPractice: "", score: 60, rationale: "", suggestion: "" },
  ];

  it("caps to 3 items on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates criteria by key", () => {
    const duped: DynamicCriterion[] = [
      { key: "fun", label: "Fun", bestPractice: "", score: 80, rationale: "", suggestion: "" },
      { key: "fun", label: "Fun (dup)", bestPractice: "", score: 90, rationale: "", suggestion: "" },
      { key: "scope", label: "Scope", bestPractice: "", score: 70, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result.filter((r) => r.key === "fun")).toHaveLength(1);
    expect(result[0].score).toBe(80); // first occurrence wins
  });

  it("locks to prior criteria order and keys", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "Keep it small" },
      { key: "fun", label: "Fun", bestPractice: "Make it fun" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[1].key).toBe("fun");
  });

  it("uses prior label and bestPractice, not model's", () => {
    const prior: CriterionSpec[] = [
      { key: "fun", label: "Original Label", bestPractice: "Original Best Practice" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Original Label");
    expect(result[0].bestPractice).toBe("Original Best Practice");
  });

  it("clamps scores from model output", () => {
    const bad: DynamicCriterion[] = [
      { key: "fun", label: "Fun", bestPractice: "", score: 999, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(bad, null);
    expect(result[0].score).toBe(100);
  });

  it("handles undefined or empty items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toHaveLength(0);
    expect(normalizeDynamicCriteria([], null)).toHaveLength(0);
  });
});

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
