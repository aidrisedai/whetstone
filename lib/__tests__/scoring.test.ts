import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("handles NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles non-number", () => expect(clamp("foo" as unknown as number)).toBe(0));
  it("keeps valid values", () => expect(clamp(80)).toBe(80));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value for one-element array", () => expect(computeOverall([70])).toBe(70));
  it("returns the mean for multiple values", () => expect(computeOverall([60, 80, 100])).toBe(80));
  it("rounds correctly", () => expect(computeOverall([65, 66])).toBe(66));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns false when overall below threshold", () => expect(isReady(79, [80, 75], 80)).toBe(false));
  it("returns false when a dimension is below the floor", () => {
    expect(isReady(82, [90, 64], 80)).toBe(false);
  });
  it("returns true when overall meets threshold and all dims meet floor", () => {
    expect(isReady(80, [80, 65, 70], 80)).toBe(true);
  });
  it("respects a custom threshold", () => {
    expect(isReady(75, [80, 70], 90)).toBe(false);
    expect(isReady(90, [90, 70], 90)).toBe(true);
  });
});

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("finalizeAssessment", () => {
  it("clamps all scores and computes overall deterministically", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: makeDim(110),
      conciseness: makeDim(-5),
      dynamicCriteria: [makeDynamic("audience", 75)],
      refinedPrompt: "test",
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.dynamicCriteria[0].score).toBe(75);
    expect(result.overall).toBe(Math.round((100 + 0 + 75) / 3));
  });

  it("sets ready=true when scores cross the threshold and floor", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: makeDim(85),
      conciseness: makeDim(80),
      dynamicCriteria: [makeDynamic("audience", 82)],
      refinedPrompt: "p",
    }, 80);
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("sets ready=false when a dimension is below DIMENSION_FLOOR", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: makeDim(95),
      conciseness: makeDim(60),
      dynamicCriteria: [makeDynamic("audience", 90)],
      refinedPrompt: "p",
    }, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the active threshold on the result", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: makeDim(80),
      conciseness: makeDim(80),
      dynamicCriteria: [],
      refinedPrompt: "p",
    }, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key", () => {
    const items = [makeDynamic("a", 70), makeDynamic("a", 80), makeDynamic("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first wins
  });

  it("caps to 3 on first assessment", () => {
    const items = [
      makeDynamic("a", 70),
      makeDynamic("b", 60),
      makeDynamic("c", 75),
      makeDynamic("d", 80),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior spec order when criteria are fixed", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
      { key: "scope", label: "Scope", bestPractice: "set_constraints" },
    ];
    const items = [makeDynamic("scope", 90), makeDynamic("audience", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(90);
  });

  it("handles undefined items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters out items with non-string keys", () => {
    const items = [
      { key: 123 as unknown as string, label: "x", bestPractice: "x", score: 70, rationale: "", suggestion: "" },
      makeDynamic("valid", 80),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("valid");
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80", () => expect(DEFAULT_THRESHOLD).toBe(80));
  it("DIMENSION_FLOOR is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
