import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../scoring";
import type { DynamicCriterion } from "../types";

// ── helpers ──────────────────────────────────────────────────────────────────

function dim(score: number): DynamicCriterion {
  return { key: "k", label: "K", bestPractice: "bp", score, rationale: "r", suggestion: "s" };
}

function rawAssessment(overrides: Partial<Parameters<typeof finalizeAssessment>[0]> = {}) {
  return {
    projectType: "Web app",
    clarity: { score: 70, rationale: "ok", suggestion: "be more specific" },
    conciseness: { score: 75, rationale: "ok", suggestion: "tighten it" },
    dynamicCriteria: [dim(80), dim(85)],
    refinedPrompt: "Build a todo app",
    ...overrides,
  };
}

// ── clamp ─────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("passes values in range through", () => expect(clamp(50)).toBe(50));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("abc" as unknown as number)).toBe(0));
});

// ── computeOverall ────────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the value for a single score", () => expect(computeOverall([70])).toBe(70));
  it("averages multiple scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([67, 68])).toBe(68));
});

// ── dimensionScores ───────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns fixed + dynamic scores in order", () => {
    const scores = dimensionScores({
      clarity: { score: 60, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [dim(80), dim(90)],
    });
    expect(scores).toEqual([60, 70, 80, 90]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: { score: 110, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── isReady ───────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false when scores array is empty", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [90, DIMENSION_FLOOR - 1, 90], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores meet floor", () => {
    expect(isReady(80, [DIMENSION_FLOOR, DIMENSION_FLOOR, 80], 80)).toBe(true);
  });

  it("uses the supplied threshold, not a hardcoded value", () => {
    expect(isReady(70, [70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70], 75)).toBe(false);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  it("computes overall as the mean of all dimension scores", () => {
    const a = finalizeAssessment(rawAssessment(), 80);
    // clarity 70, conciseness 75, dynamic 80, 85 → mean = 77.5 → round → 78
    expect(a.overall).toBe(78);
  });

  it("stamps the threshold on the result", () => {
    const a = finalizeAssessment(rawAssessment(), 75);
    expect(a.threshold).toBe(75);
  });

  it("marks ready=false when below threshold", () => {
    const a = finalizeAssessment(rawAssessment(), 80);
    expect(a.ready).toBe(false);
  });

  it("marks ready=true when all criteria met", () => {
    const a = finalizeAssessment(
      rawAssessment({
        clarity: { score: 85, rationale: "", suggestion: "" },
        conciseness: { score: 85, rationale: "", suggestion: "" },
        dynamicCriteria: [dim(85), dim(85)],
      }),
      80,
    );
    expect(a.ready).toBe(true);
  });

  it("clamps out-of-range scores before computing", () => {
    const a = finalizeAssessment(
      rawAssessment({
        clarity: { score: 150, rationale: "", suggestion: "" },
        conciseness: { score: -10, rationale: "", suggestion: "" },
        dynamicCriteria: [],
      }),
      80,
    );
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none supplied", () => {
    const a = finalizeAssessment(rawAssessment());
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  it("returns at most 3 items when prior is null", () => {
    const items = [dim(70), dim(80), dim(90), dim(60)].map((d, i) => ({ ...d, key: `k${i}` }));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key on first assessment", () => {
    const items = [
      { ...dim(70), key: "audience" },
      { ...dim(80), key: "audience" }, // duplicate
      { ...dim(75), key: "scope" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[1].key).toBe("scope");
  });

  it("locks to prior spec set in subsequent turns", () => {
    const prior = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
      { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
    ];
    const items = [
      { ...dim(82), key: "audience", label: "Audience", bestPractice: "define_audience" },
      { ...dim(78), key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(82);
    expect(result[1].score).toBe(78);
  });

  it("preserves prior keys even when model returns different ones", () => {
    const prior = [{ key: "audience", label: "Audience", bestPractice: "define_audience" }];
    // Model returns a completely different key
    const items = [{ ...dim(70), key: "completely_different", label: "X", bestPractice: "y" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("audience");
  });

  it("handles undefined/null items gracefully", () => {
    expect(() => normalizeDynamicCriteria(undefined, null)).not.toThrow();
    expect(() => normalizeDynamicCriteria(null as unknown as undefined, null)).not.toThrow();
  });
});
