import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, DynamicCriterion } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps to 0-100", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(50)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });

  it("returns 0 for NaN / non-number", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the mean, rounded", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([70, 71, 72])).toBe(71);
  });

  it("rounds correctly", () => {
    expect(computeOverall([0, 1])).toBe(1); // 0.5 rounds up
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(85, [85, 70, 80], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 80, 80], 80)).toBe(false);
  });

  it("returns false when any dimension is below the floor", () => {
    expect(isReady(90, [90, 90, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("a", 90)],
    });
    expect(scores).toEqual([70, 80, 90]);
  });

  it("clamps out-of-range values", () => {
    const scores = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "game",
    clarity: dim(80),
    conciseness: dim(85),
    dynamicCriteria: [dynDim("fun", 75)],
    refinedPrompt: "build a thing",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((80 + 85 + 75) / 3));
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 70);
    expect(result.threshold).toBe(70);
  });

  it("marks ready when all criteria pass", () => {
    const highBase: typeof base = {
      ...base,
      clarity: dim(90),
      conciseness: dim(90),
      dynamicCriteria: [dynDim("fun", 90)],
    };
    const result = finalizeAssessment(highBase, 80);
    expect(result.ready).toBe(true);
  });

  it("marks not ready when overall is below threshold", () => {
    const result = finalizeAssessment(base, 95);
    expect(result.ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  const raw: DynamicCriterion[] = [
    dynDim("originality", 70),
    dynDim("scope", 80),
    dynDim("techfit", 60),
    dynDim("extra", 55),
  ];

  it("caps to 3 items on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(raw, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const duped: DynamicCriterion[] = [dynDim("x", 70), dynDim("x", 90)];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70); // first one wins
  });

  it("locks to prior criteria order when prior is set", () => {
    const prior = [
      { key: "techfit", label: "Tech fit", bestPractice: "bp" },
      { key: "scope", label: "Scope", bestPractice: "bp" },
    ];
    const result = normalizeDynamicCriteria(raw, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("techfit");
    expect(result[1].key).toBe("scope");
    expect(result[0].score).toBe(60);
    expect(result[1].score).toBe(80);
  });

  it("returns empty array for undefined/null input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toHaveLength(0);
  });
});
