import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  DIMENSION_FLOOR,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "./scoring";
import type { DynamicCriterion } from "./types";

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------

describe("clamp", () => {
  it("returns value unchanged when within 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("hello" as unknown as number)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeOverall
// ---------------------------------------------------------------------------

describe("computeOverall", () => {
  it("returns mean of scores rounded to integer", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds correctly", () => {
    // 70 + 71 = 141 / 2 = 70.5 → rounds to 71
    expect(computeOverall([70, 71])).toBe(71);
  });
});

// ---------------------------------------------------------------------------
// isReady
// ---------------------------------------------------------------------------

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores are above floor", () => {
    expect(isReady(85, [85, 90, 80], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 90, 80], 80)).toBe(false);
  });

  it("returns false when any score is below the dimension floor", () => {
    expect(isReady(85, [85, 90, 64], 80)).toBe(false);
    expect(isReady(85, [85, 90, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });

  it("returns true when all scores exactly meet the floor and overall meets threshold", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// finalizeAssessment
// ---------------------------------------------------------------------------

const baseDynamic: DynamicCriterion[] = [
  { key: "scope", label: "Scope", bestPractice: "tight", score: 72, rationale: "ok", suggestion: "" },
];

describe("finalizeAssessment", () => {
  it("clamps out-of-range scores and computes overall correctly", () => {
    const result = finalizeAssessment({
      clarity: { score: 150, rationale: "great", suggestion: "" },
      conciseness: { score: -10, rationale: "ok", suggestion: "" },
      dynamicCriteria: baseDynamic,
      summary: "test",
    });

    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.dynamicCriteria[0].score).toBe(72);
    expect(result.overall).toBe(Math.round((100 + 0 + 72) / 3));
  });

  it("marks ready correctly with custom threshold", () => {
    const readyResult = finalizeAssessment(
      {
        clarity: { score: 85, rationale: "", suggestion: "" },
        conciseness: { score: 85, rationale: "", suggestion: "" },
        dynamicCriteria: baseDynamic,
        summary: "test",
      },
      80,
    );
    expect(readyResult.ready).toBe(true);
    expect(readyResult.threshold).toBe(80);
  });

  it("marks not ready when a dimension is below floor even with high overall", () => {
    const notReadyResult = finalizeAssessment({
      clarity: { score: 60, rationale: "", suggestion: "" },
      conciseness: { score: 100, rationale: "", suggestion: "" },
      dynamicCriteria: [{ ...baseDynamic[0], score: 100 }],
      summary: "test",
    });
    expect(notReadyResult.ready).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeDynamicCriteria
// ---------------------------------------------------------------------------

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "audience", label: "Audience", bestPractice: "defined", score: 70, rationale: "r", suggestion: "" },
    { key: "scope", label: "Scope", bestPractice: "tight", score: 80, rationale: "r", suggestion: "" },
    { key: "mechanic", label: "Core Mechanic", bestPractice: "clear", score: 65, rationale: "r", suggestion: "" },
    { key: "extra", label: "Extra", bestPractice: "x", score: 90, rationale: "r", suggestion: "" },
  ];

  it("caps to 3 items when no prior criteria exist", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const dupes: DynamicCriterion[] = [
      { key: "audience", label: "A", bestPractice: "x", score: 70, rationale: "", suggestion: "" },
      { key: "audience", label: "A dup", bestPractice: "x", score: 90, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70); // keeps the first occurrence
  });

  it("locks to prior criteria order and keys when prior is set", () => {
    const prior = [
      { key: "scope", label: "Scope", bestPractice: "tight" },
      { key: "audience", label: "Audience", bestPractice: "defined" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[0].score).toBe(80);
    expect(result[1].key).toBe("audience");
    expect(result[1].score).toBe(70);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
