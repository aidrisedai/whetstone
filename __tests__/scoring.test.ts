import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion } from "../lib/types";

describe("clamp", () => {
  it("clamps values above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("clamps values below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("passes through valid values", () => expect(clamp(80)).toBe(80));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles boundary 0", () => expect(clamp(0)).toBe(0));
  it("handles boundary 100", () => expect(clamp(100)).toBe(100));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value for a one-element array", () => expect(computeOverall([75])).toBe(75));
  it("averages correctly", () => expect(computeOverall([60, 80, 70])).toBe(70));
  it("rounds to nearest integer", () => expect(computeOverall([70, 71])).toBe(71));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns true when overall meets threshold and all scores above floor", () => {
    expect(isReady(85, [80, 75, 70], 80)).toBe(true);
  });
  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [80, 80, 80], 80)).toBe(false);
  });
  it("returns false when any score is below the dimension floor", () => {
    expect(isReady(85, [90, 90, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
  it("returns true when a score is exactly at the floor", () => {
    expect(isReady(85, [90, 90, DIMENSION_FLOOR], 80)).toBe(true);
  });
  it("returns false when overall exactly meets threshold but a score is below floor", () => {
    expect(isReady(80, [80, 80, 60], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web App",
    refinedPrompt: "Build a todo app",
    clarity: { score: 110, rationale: "Good", suggestion: "" },
    conciseness: { score: -5, rationale: "Too long", suggestion: "Trim it" },
    dynamicCriteria: [
      { key: "scope", label: "Scope", bestPractice: "", score: 72.4, rationale: "", suggestion: "" },
    ],
  };

  it("clamps clarity score", () => {
    const r = finalizeAssessment(base);
    expect(r.clarity.score).toBe(100);
  });

  it("clamps conciseness score", () => {
    const r = finalizeAssessment(base);
    expect(r.conciseness.score).toBe(0);
  });

  it("clamps dynamic criteria scores", () => {
    const r = finalizeAssessment(base);
    expect(r.dynamicCriteria[0].score).toBe(72);
  });

  it("computes overall as mean of clamped scores", () => {
    const r = finalizeAssessment(base);
    expect(r.overall).toBe(Math.round((100 + 0 + 72) / 3));
  });

  it("stamps the threshold", () => {
    const r = finalizeAssessment(base, 70);
    expect(r.threshold).toBe(70);
  });

  it("sets ready=false when scores are too low", () => {
    const r = finalizeAssessment(base, 80);
    expect(r.ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  const item = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: "",
    score,
    rationale: "",
    suggestion: "",
  });

  it("deduplicates by key (first occurrence wins)", () => {
    const result = normalizeDynamicCriteria([item("a", 80), item("a", 90)], null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 items on first assessment", () => {
    const items = [item("a", 70), item("b", 75), item("c", 80), item("d", 85)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks criteria to prior spec order", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "" },
      { key: "a", label: "A", bestPractice: "" },
    ];
    const items = [item("a", 70), item("b", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("b");
    expect(result[1].key).toBe("a");
  });

  it("handles undefined input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters non-object items", () => {
    const result = normalizeDynamicCriteria(
      [null as unknown as DynamicCriterion, item("a", 50)],
      null,
    );
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
  });
});
