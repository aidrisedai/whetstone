import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
  DIMENSION_FLOOR,
} from "../scoring";
import type { Assessment, DynamicCriterion } from "../types";

// ── clamp ─────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(105)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
  it("passes through boundary values", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
});

// ── dimensionScores ───────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns clamped scores for all dimensions", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "", score: 90, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([80, 70, 90]);
  });

  it("clamps out-of-range dynamic scores", () => {
    const scores = dimensionScores({
      clarity: { score: -10, rationale: "", suggestion: "" },
      conciseness: { score: 200, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([0, 100]);
  });
});

// ── computeOverall ────────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds to nearest integer", () => expect(computeOverall([70, 71])).toBe(71));
  it("averages evenly", () => expect(computeOverall([80, 60])).toBe(70));
  it("handles a single score", () => expect(computeOverall([85])).toBe(85));
});

// ── isReady ───────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("returns false for empty scores", () => expect(isReady(90, [], threshold)).toBe(false));
  it("returns true when overall ≥ threshold and all dimensions ≥ floor", () => {
    expect(isReady(85, [85, 80, 70], threshold)).toBe(true);
  });
  it("returns false when overall < threshold", () => {
    expect(isReady(79, [85, 80, 70], threshold)).toBe(false);
  });
  it("returns false when one dimension is below floor", () => {
    expect(isReady(85, [85, 80, 64], threshold)).toBe(false);
  });
  it("requires every dimension to clear the floor", () => {
    expect(isReady(85, [DIMENSION_FLOOR, DIMENSION_FLOOR, DIMENSION_FLOOR], threshold)).toBe(true);
    expect(isReady(85, [DIMENSION_FLOOR - 1, 90, 90], threshold)).toBe(false);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

function makeRaw(
  clarityScore: number,
  concisenessScore: number,
  dynamicScores: number[] = [],
): Omit<Assessment, "overall" | "ready" | "threshold"> {
  return {
    projectType: "App",
    clarity: { score: clarityScore, rationale: "r", suggestion: "s" },
    conciseness: { score: concisenessScore, rationale: "r", suggestion: "s" },
    dynamicCriteria: dynamicScores.map((score, i) => ({
      key: `d${i}`,
      label: `D${i}`,
      bestPractice: "bp",
      score,
      rationale: "r",
      suggestion: "s",
    })),
    refinedPrompt: "Build me an app.",
  };
}

describe("finalizeAssessment", () => {
  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(makeRaw(80, 80, [80]), 80);
    expect(result.overall).toBe(80);
  });

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment(makeRaw(-10, 200), 80);
    expect(result.clarity.score).toBe(0);
    expect(result.conciseness.score).toBe(100);
  });

  it("sets ready=true when threshold and floor met", () => {
    const result = finalizeAssessment(makeRaw(85, 85, [85]), 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall below threshold", () => {
    const result = finalizeAssessment(makeRaw(70, 70, [70]), 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(makeRaw(80, 80), 75);
    expect(result.threshold).toBe(75);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key.toUpperCase(),
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key (keeps first occurrence)", () => {
    const items = [makeDynamic("a", 80), makeDynamic("a", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 on first assessment", () => {
    const items = [
      makeDynamic("a", 80),
      makeDynamic("b", 70),
      makeDynamic("c", 75),
      makeDynamic("d", 85),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("returns empty array for non-array input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toHaveLength(0);
  });

  it("locks to prior criteria when provided", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "bp" },
      { key: "b", label: "B", bestPractice: "bp" },
    ];
    const items = [makeDynamic("a", 90), makeDynamic("b", 75), makeDynamic("c", 60)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(90);
    expect(result[1].key).toBe("b");
  });

  it("preserves prior labels and bestPractice even when score updates", () => {
    const prior = [{ key: "a", label: "MyLabel", bestPractice: "My best practice" }];
    const items = [makeDynamic("a", 88)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("MyLabel");
    expect(result[0].bestPractice).toBe("My best practice");
    expect(result[0].score).toBe(88);
  });
});
