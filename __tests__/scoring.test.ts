import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "@/lib/types";

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const makeDynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through valid values unchanged", () => expect(clamp(55)).toBe(55));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value for one-element array", () => expect(computeOverall([80])).toBe(80));
  it("computes mean correctly", () => expect(computeOverall([60, 80, 100])).toBe(80));
  it("rounds the result", () => expect(computeOverall([67, 68])).toBe(68));
});

describe("isReady", () => {
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });
  it("returns false when a dimension is below the floor", () => {
    expect(isReady(85, [85, 60, 85], 80)).toBe(false);
  });
  it("returns true when overall and all dimensions pass", () => {
    expect(isReady(85, [85, 70, 85], 80)).toBe(true);
  });
  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });
  it("respects custom threshold", () => {
    expect(isReady(75, [75, 70, 75], 70)).toBe(true);
  });
});

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores", () => {
    const result = dimensionScores({
      clarity: makeDim(80),
      conciseness: makeDim(70),
      dynamicCriteria: [makeDynDim("a", 90), makeDynDim("b", 60)],
    });
    expect(result).toEqual([80, 70, 90, 60]);
  });

  it("clamps out-of-range values", () => {
    const result = dimensionScores({
      clarity: makeDim(200),
      conciseness: makeDim(-5),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Game",
    clarity: makeDim(85),
    conciseness: makeDim(78),
    dynamicCriteria: [makeDynDim("core_mechanic", 82)],
    refinedPrompt: "Build a game",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((85 + 78 + 82) / 3));
  });

  it("stamps the threshold", () => {
    expect(finalizeAssessment(raw, 75).threshold).toBe(75);
  });

  it("marks ready when overall >= threshold and all dims >= floor", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(result.overall >= 80 && Math.min(85, 78, 82) >= DIMENSION_FLOOR);
  });

  it("marks not ready when a dimension is below the floor", () => {
    const rawLow = { ...raw, clarity: makeDim(40) };
    const result = finalizeAssessment(rawLow, 60);
    expect(result.ready).toBe(false);
  });

  it("clamps extreme scores inside the assessment", () => {
    const rawExtreme = { ...raw, clarity: makeDim(150) };
    const result = finalizeAssessment(rawExtreme, 80);
    expect(result.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "audience", label: "Audience", bestPractice: "define_audience" },
    { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
  ];

  it("deduplicates by key", () => {
    const dups: DynamicCriterion[] = [makeDynDim("a", 80), makeDynDim("a", 90)];
    const result = normalizeDynamicCriteria(dups, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
  });

  it("caps to 3 items on first assessment (no prior)", () => {
    const many = ["a", "b", "c", "d", "e"].map((k) => makeDynDim(k, 70));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria order on subsequent assessments", () => {
    const incoming: DynamicCriterion[] = [
      { ...specs[1], score: 75, rationale: "", suggestion: "" },
      { ...specs[0], score: 82, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(incoming, specs);
    expect(result[0].key).toBe("audience");
    expect(result[1].key).toBe("scope");
  });

  it("handles undefined/null gracefully", () => {
    expect(normalizeDynamicCriteria(undefined as never, null)).toEqual([]);
  });
});
