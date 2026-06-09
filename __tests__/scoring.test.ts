import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

// ── clamp ─────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes through values in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below zero to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(74.6)).toBe(75);
    expect(clamp(74.4)).toBe(74);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number", () => {
    expect(clamp("not a number" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ────────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the sole score for a single-element array", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("returns the mean of multiple scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("rounds the mean", () => {
    expect(computeOverall([60, 61])).toBe(61);
  });
});

// ── isReady ───────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("returns false for empty scores", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79], threshold)).toBe(false);
  });

  it("returns false when overall passes but a dimension is below floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR - 1], threshold)).toBe(false);
  });

  it("returns true when overall meets threshold and all dimensions clear the floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR], threshold)).toBe(true);
    expect(isReady(95, [80, 90, 100], threshold)).toBe(true);
  });

  it("is sensitive to the supplied threshold, not a hardcoded constant", () => {
    expect(isReady(70, [70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70], 80)).toBe(false);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

const baseDim = { score: 80, rationale: "r", suggestion: "s" };
const baseDynamic: DynamicCriterion = {
  key: "usefulness",
  label: "Usefulness",
  bestPractice: "Target a real need",
  score: 85,
  rationale: "r",
  suggestion: "s",
};

describe("finalizeAssessment", () => {
  it("clamps scores into 0-100", () => {
    const raw = {
      projectType: "Game",
      clarity: { score: 150, rationale: "r", suggestion: "s" },
      conciseness: { score: -10, rationale: "r", suggestion: "s" },
      dynamicCriteria: [],
      refinedPrompt: "p",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("computes overall as the mean of all dimensions", () => {
    const raw = {
      projectType: "App",
      clarity: { ...baseDim, score: 80 },
      conciseness: { ...baseDim, score: 80 },
      dynamicCriteria: [{ ...baseDynamic, score: 80 }],
      refinedPrompt: "p",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(80);
  });

  it("marks ready=true when crossing the threshold with all dimensions above floor", () => {
    const raw = {
      projectType: "App",
      clarity: { ...baseDim, score: 80 },
      conciseness: { ...baseDim, score: 80 },
      dynamicCriteria: [{ ...baseDynamic, score: 80 }],
      refinedPrompt: "p",
    };
    expect(finalizeAssessment(raw, 80).ready).toBe(true);
  });

  it("marks ready=false when a dimension is below DIMENSION_FLOOR", () => {
    const raw = {
      projectType: "App",
      clarity: { ...baseDim, score: 90 },
      conciseness: { ...baseDim, score: 90 },
      dynamicCriteria: [{ ...baseDynamic, score: DIMENSION_FLOOR - 1 }],
      refinedPrompt: "p",
    };
    expect(finalizeAssessment(raw, 80).ready).toBe(false);
  });

  it("stamps the supplied threshold onto the result", () => {
    const raw = {
      projectType: "App",
      clarity: baseDim,
      conciseness: baseDim,
      dynamicCriteria: [],
      refinedPrompt: "p",
    };
    expect(finalizeAssessment(raw, 75).threshold).toBe(75);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key on first assessment", () => {
    const items: DynamicCriterion[] = [
      { ...baseDynamic, key: "a" },
      { ...baseDynamic, key: "a" }, // duplicate
      { ...baseDynamic, key: "b" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(2);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
  });

  it("caps to 3 criteria on first assessment", () => {
    const items: DynamicCriterion[] = [
      { ...baseDynamic, key: "a" },
      { ...baseDynamic, key: "b" },
      { ...baseDynamic, key: "c" },
      { ...baseDynamic, key: "d" },
    ];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toHaveLength(0);
    expect(normalizeDynamicCriteria([], null)).toHaveLength(0);
  });

  it("locks to prior criteria order and keys on subsequent assessments", () => {
    const prior: CriterionSpec[] = [
      { key: "usefulness", label: "Usefulness", bestPractice: "bp1" },
      { key: "clarity_tech", label: "Tech Clarity", bestPractice: "bp2" },
    ];
    const items: DynamicCriterion[] = [
      { key: "clarity_tech", label: "Tech Clarity", bestPractice: "bp2", score: 75, rationale: "r", suggestion: "s" },
      { key: "usefulness", label: "Usefulness", bestPractice: "bp1", score: 85, rationale: "r", suggestion: "s" },
      { key: "extra", label: "Extra", bestPractice: "bp3", score: 90, rationale: "r", suggestion: "s" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    // Should be locked to prior order: usefulness first, then clarity_tech
    expect(result[0].key).toBe("usefulness");
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("clarity_tech");
    expect(result[1].score).toBe(75);
    // "extra" is excluded because it's not in prior
    expect(result).toHaveLength(2);
  });

  it("uses prior label/bestPractice (not model's re-stated version)", () => {
    const prior: CriterionSpec[] = [
      { key: "usefulness", label: "Usefulness", bestPractice: "canonical bp" },
    ];
    const items: DynamicCriterion[] = [
      { key: "usefulness", label: "Different label", bestPractice: "different bp", score: 80, rationale: "r", suggestion: "s" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Usefulness");
    expect(result[0].bestPractice).toBe("canonical bp");
  });
});
