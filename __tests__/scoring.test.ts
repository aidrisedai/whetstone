import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
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
  it("rounds decimals", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });
  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("foo" as never)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("averages correctly", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });
  it("rounds the result", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 → 71
  });
});

describe("isReady", () => {
  it("requires overall >= threshold", () => {
    expect(isReady(79, [79, 79], 80)).toBe(false);
    expect(isReady(80, [80, 80], 80)).toBe(true);
  });
  it("requires every dimension >= DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR - 1], 80)).toBe(false);
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true);
  });
  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  it("clamps scores, computes overall, and sets ready flag", () => {
    const result = finalizeAssessment(
      {
        projectType: "Web app",
        clarity: dim(90),
        conciseness: dim(70),
        dynamicCriteria: [dynDim("audience", 80)],
        refinedPrompt: "Build a thing.",
      },
      80,
    );
    expect(result.overall).toBe(80); // (90+70+80)/3 = 80
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("is not ready when a dimension is below DIMENSION_FLOOR", () => {
    const result = finalizeAssessment(
      {
        projectType: "Web app",
        clarity: dim(90),
        conciseness: dim(90),
        dynamicCriteria: [dynDim("audience", 60)], // below floor
        refinedPrompt: "Build a thing.",
      },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range model scores", () => {
    const result = finalizeAssessment(
      {
        projectType: "Game",
        clarity: dim(120),
        conciseness: dim(-5),
        dynamicCriteria: [],
        refinedPrompt: "Build a game.",
      },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key on first assessment", () => {
    const raw: DynamicCriterion[] = [
      dynDim("audience", 70),
      dynDim("audience", 80), // duplicate
      dynDim("success", 65),
    ];
    const result = normalizeDynamicCriteria(raw, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(70); // first one wins
  });

  it("caps to 3 on first assessment", () => {
    const raw: DynamicCriterion[] = [
      dynDim("a", 70),
      dynDim("b", 70),
      dynDim("c", 70),
      dynDim("d", 70),
    ];
    expect(normalizeDynamicCriteria(raw, null)).toHaveLength(3);
  });

  it("locks to prior specs when provided", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
      { key: "success", label: "Success criteria", bestPractice: "success_criteria" },
    ];
    const raw: DynamicCriterion[] = [
      dynDim("audience", 85),
      dynDim("success", 75),
      dynDim("extra", 90), // not in prior — should be dropped
    ];
    const result = normalizeDynamicCriteria(raw, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("success");
    expect(result[0].label).toBe("Audience"); // label locked from prior
  });

  it("falls back to 0 score when prior key is absent from model output", () => {
    const prior: CriterionSpec[] = [
      { key: "missing", label: "Missing", bestPractice: "be_clear" },
    ];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].score).toBe(0);
    expect(result[0].key).toBe("missing");
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(null as never, null)).toEqual([]);
  });
});
