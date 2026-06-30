import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("rounds and clamps to 0–100", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
    expect(clamp(-5)).toBe(0);
    expect(clamp(110)).toBe(100);
  });

  it("treats NaN and non-numbers as 0", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as never)).toBe(0);
  });
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns the mean, rounded", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 75, 80])).toBe(75);
    expect(computeOverall([33, 34])).toBe(34); // 33.5 → rounds to 34
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("true when overall meets threshold and no dimension below floor", () => {
    expect(isReady(80, [80, 80], 80)).toBe(true);
    expect(isReady(90, [65, 90, 85], 80)).toBe(true);
  });

  it("false when overall is below threshold", () => {
    expect(isReady(79, [90, 90], 80)).toBe(false);
  });

  it("false when any dimension is below the floor (65)", () => {
    expect(isReady(85, [64, 90, 90], 80)).toBe(false);
    expect(isReady(85, [65, 90, 90], 80)).toBe(true); // exactly at floor is fine
  });

  it("false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });
});

// ── dimensionScores ────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("concatenates clarity + conciseness + dynamic into one array", () => {
    const assessment = {
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 75, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "a", score: 70, rationale: "", suggestion: "" },
        { key: "b", label: "B", bestPractice: "b", score: 65, rationale: "", suggestion: "" },
      ] as DynamicCriterion[],
    };
    expect(dimensionScores(assessment)).toEqual([80, 75, 70, 65]);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeCrit = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "",
    suggestion: "",
  });

  it("deduplicates by key (keeps first occurrence)", () => {
    const items = [makeCrit("a", 80), makeCrit("a", 90), makeCrit("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 when there are no prior criteria", () => {
    const items = [makeCrit("a", 80), makeCrit("b", 70), makeCrit("c", 60), makeCrit("d", 50)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior spec order and updates scores when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "b" },
      { key: "a", label: "A", bestPractice: "a" },
    ];
    const items = [makeCrit("a", 80), makeCrit("b", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("b");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(80);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(null as never, null)).toEqual([]);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: { score: 85, rationale: "", suggestion: "" },
    conciseness: { score: 75, rationale: "", suggestion: "" },
    dynamicCriteria: [
      { key: "a", label: "A", bestPractice: "a", score: 80, rationale: "", suggestion: "" },
    ] as DynamicCriterion[],
    refinedPrompt: "Build something cool",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 80) / 3));
  });

  it("sets ready=true when overall >= threshold and no dimension below floor", () => {
    const result = finalizeAssessment(base, 80);
    // All scores >= 65 and overall >= 80 → ready
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when a dimension is below the floor", () => {
    const lowBase = {
      ...base,
      clarity: { score: 60, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(lowBase, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold onto the result", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores from the model", () => {
    const oob = { ...base, clarity: { score: 150, rationale: "", suggestion: "" } };
    const result = finalizeAssessment(oob, 80);
    expect(result.clarity.score).toBe(100);
  });

  it("uses DEFAULT_THRESHOLD when none is provided", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ── constants ─────────────────────────────────────────────────────────────

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
