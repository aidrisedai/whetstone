import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion } from "../types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(105)).toBe(100));
  it("passes through values in range", () => expect(clamp(75)).toBe(75));
  it("rounds floats", () => expect(clamp(74.6)).toBe(75));
  it("handles NaN as 0", () => expect(clamp(NaN)).toBe(0));
  it("handles non-number as 0", () => expect(clamp("abc" as unknown as number)).toBe(0));
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value for a one-element array", () => expect(computeOverall([70])).toBe(70));
  it("computes the mean correctly", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([70, 71])).toBe(71)); // 70.5 → rounds to 71
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(80, [], 80)).toBe(false));
  it("returns true when overall meets threshold and all dimensions clear the floor", () => {
    expect(isReady(80, [70, 75, 80], 80)).toBe(true);
  });
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [70, 75, 80], 80)).toBe(false);
  });
  it("returns false when one dimension is below the floor", () => {
    expect(isReady(80, [64, 85, 90], 80)).toBe(false);
  });
  it("is true exactly at threshold with all dims at floor", () => {
    expect(isReady(80, [DIMENSION_FLOOR, DIMENSION_FLOOR, 100], 80)).toBe(true);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

const makeDim = (score: number) => ({ score, rationale: "ok", suggestion: "ok" });
const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "ok",
  suggestion: "ok",
});

describe("finalizeAssessment", () => {
  it("clamps and computes overall + ready deterministically", () => {
    const raw = {
      projectType: "web",
      clarity: makeDim(90),
      conciseness: makeDim(70),
      dynamicCriteria: [makeDynamic("audience", 85)],
      refinedPrompt: "build something cool",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((90 + 70 + 85) / 3));
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("marks not-ready when a dimension is below the floor", () => {
    const raw = {
      projectType: "web",
      clarity: makeDim(90),
      conciseness: makeDim(60), // below DIMENSION_FLOOR (65)
      dynamicCriteria: [makeDynamic("audience", 90)],
      refinedPrompt: "build something cool",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const raw = {
      projectType: "web",
      clarity: makeDim(999),
      conciseness: makeDim(-10),
      dynamicCriteria: [],
      refinedPrompt: "x",
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  it("deduplicates items with the same key", () => {
    const items = [makeDynamic("audience", 70), makeDynamic("audience", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(70); // first-seen wins
  });

  it("caps to 3 items on the first assessment (no prior)", () => {
    const items = [
      makeDynamic("a", 70),
      makeDynamic("b", 70),
      makeDynamic("c", 70),
      makeDynamic("d", 70),
    ];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks criteria order to prior when provided", () => {
    const prior = [
      { key: "audience", label: "Audience", bestPractice: "bp" },
      { key: "scope", label: "Scope", bestPractice: "bp" },
    ];
    const items = [makeDynamic("scope", 80), makeDynamic("audience", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(80);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
