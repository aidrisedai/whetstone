import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  DIMENSION_FLOOR,
  normalizeDynamicCriteria,
  finalizeAssessment,
  dimensionScores,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("clamps negative to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.7)).toBe(73));
  it("passes through valid values", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns single score unchanged", () => expect(computeOverall([80])).toBe(80));
  it("averages scores and rounds", () => expect(computeOverall([70, 80])).toBe(75));
  it("rounds fractional means", () => expect(computeOverall([70, 81])).toBe(76));
  it("handles all zeros", () => expect(computeOverall([0, 0, 0])).toBe(0));
  it("handles all 100s", () => expect(computeOverall([100, 100, 100])).toBe(100));
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns true when overall meets threshold and all above floor", () =>
    expect(isReady(85, [85, 80, 70], 80)).toBe(true));
  it("returns false when overall below threshold", () =>
    expect(isReady(75, [80, 75, 70], 80)).toBe(false));
  it("returns false when one dimension below floor", () =>
    expect(isReady(85, [90, 90, DIMENSION_FLOOR - 1], 80)).toBe(false));
  it("passes exactly at threshold and floor", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR, 80], 80)).toBe(true));
});

// ── dimensionScores ────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores", () => {
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "K1", bestPractice: "", score: 90, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([80, 70, 90]);
  });

  it("clamps out-of-range dimension scores", () => {
    const result = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

function makeCriterion(key: string, score: number): DynamicCriterion {
  return { key, label: key, bestPractice: "", score, rationale: "r", suggestion: "s" };
}

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key, keeping the first occurrence", () => {
    const items = [makeCriterion("a", 70), makeCriterion("a", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 criteria when no prior", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeCriterion(k, 75));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior spec order and updates scores", () => {
    const prior: CriterionSpec[] = [
      { key: "x", label: "X", bestPractice: "bp-x" },
      { key: "y", label: "Y", bestPractice: "bp-y" },
    ];
    const incoming = [makeCriterion("y", 88), makeCriterion("x", 55)];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(55);
    expect(result[0].label).toBe("X");
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(88);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters items without a string key", () => {
    const items = [{ key: 123, label: "bad", score: 50 } as unknown as DynamicCriterion];
    expect(normalizeDynamicCriteria(items, null)).toEqual([]);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  it("computes overall, clamps scores, and sets ready flag", () => {
    const raw = {
      projectType: "web-app",
      refinedPrompt: "A todo list app",
      clarity: { score: 90, rationale: "clear", suggestion: "" },
      conciseness: { score: 80, rationale: "ok", suggestion: "" },
      dynamicCriteria: [makeCriterion("market", 85)],
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(90);
    expect(result.conciseness.score).toBe(80);
    expect(result.overall).toBe(85);
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("marks not ready when overall below threshold", () => {
    const raw = {
      projectType: "web-app",
      refinedPrompt: "A vague idea",
      clarity: { score: 70, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    };
    expect(finalizeAssessment(raw, 80).ready).toBe(false);
  });
});
