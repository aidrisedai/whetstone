import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

describe("clamp", () => {
  it("clamps values to 0–100", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(110)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(49.7)).toBe(50);
    expect(clamp(49.2)).toBe(49);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all dimensions clear the floor", () => {
    expect(isReady(85, [85, 80, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [80, 80, 75], 80)).toBe(false);
  });

  it("returns false when any dimension is below the floor", () => {
    expect(isReady(85, [85, 90, 60], 80)).toBe(false);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "clarity", label: "Clarity", bestPractice: "be_clear_and_direct", score: 75, rationale: "r", suggestion: "s" },
    { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope", score: 60, rationale: "r", suggestion: "s" },
  ];

  it("deduplicates by key", () => {
    const duped: DynamicCriterion[] = [...items, { ...items[0] }];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result.length).toBe(2);
  });

  it("caps to 3 on first assessment", () => {
    const many: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: "be_clear_and_direct",
      score: 70,
      rationale: "r",
      suggestion: "s",
    }));
    expect(normalizeDynamicCriteria(many, null).length).toBe(3);
  });

  it("locks to prior criteria order when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
      { key: "clarity", label: "Clarity", bestPractice: "be_clear_and_direct" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("scope");
    expect(result[1].key).toBe("clarity");
    expect(result[0].score).toBe(60);
    expect(result[1].score).toBe(75);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Game",
    clarity: { score: 90, rationale: "r", suggestion: "s" },
    conciseness: { score: 80, rationale: "r", suggestion: "s" },
    dynamicCriteria: [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic", score: 85, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "Build a game.",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(raw);
    expect(result.overall).toBe(Math.round((90 + 80 + 85) / 3));
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("sets ready=true when all conditions met", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when a dimension is below the floor", () => {
    const lowFloor = {
      ...raw,
      dynamicCriteria: [
        { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic", score: 50, rationale: "r", suggestion: "s" },
      ],
    };
    const result = finalizeAssessment(lowFloor, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const outOfRange = {
      ...raw,
      clarity: { score: 150, rationale: "r", suggestion: "s" },
    };
    const result = finalizeAssessment(outOfRange);
    expect(result.clarity.score).toBe(100);
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
