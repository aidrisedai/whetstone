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
} from "../lib/scoring";
import type { DynamicCriterion } from "../lib/types";

// ── clamp ─────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes values already in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("floors negative numbers to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("caps values above 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(49.4)).toBe(49);
    expect(clamp(49.5)).toBe(50);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number types", () => {
    // @ts-expect-error testing runtime guard
    expect(clamp("hello")).toBe(0);
    // @ts-expect-error testing runtime guard
    expect(clamp(null)).toBe(0);
  });
});

// ── computeOverall ────────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty list", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns single value unchanged", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("averages multiple scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
  });

  it("rounds the mean", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 → rounds to 71
  });

  it("handles all zeros", () => {
    expect(computeOverall([0, 0, 0])).toBe(0);
  });

  it("handles all 100s", () => {
    expect(computeOverall([100, 100, 100])).toBe(100);
  });
});

// ── dimensionScores ───────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns clamped scores for clarity, conciseness, and dynamic criteria", () => {
    const result = dimensionScores({
      clarity: { score: 110, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [{ key: "a", label: "A", bestPractice: "", score: 72, rationale: "", suggestion: "" }],
    });
    expect(result).toEqual([100, 0, 72]);
  });

  it("returns just two scores when no dynamic criteria", () => {
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 60, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([80, 60]);
  });
});

// ── isReady ───────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores above floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 75, 70], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    const belowFloor = DIMENSION_FLOOR - 1;
    expect(isReady(85, [85, 85, belowFloor], 80)).toBe(false);
  });

  it("returns true at exactly the threshold and floor", () => {
    expect(isReady(80, [DIMENSION_FLOOR, DIMENSION_FLOOR, 80], 80)).toBe(true);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "web app",
    clarity: { score: 90, rationale: "clear", suggestion: "" },
    conciseness: { score: 85, rationale: "concise", suggestion: "" },
    dynamicCriteria: [
      { key: "originality", label: "Originality", bestPractice: "", score: 78, rationale: "fresh", suggestion: "" },
    ],
    refinedPrompt: "Build a todo app for teens.",
  };

  it("clamps out-of-range scores", () => {
    const raw = {
      ...baseRaw,
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw);
    const expected = Math.round((90 + 85 + 78) / 3);
    expect(result.overall).toBe(expected);
  });

  it("sets ready=true when threshold is met and all dimensions clear floor", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(baseRaw, 99);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(baseRaw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeCrit = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: "",
    score,
    rationale: "",
    suggestion: "",
  });

  it("deduplicates items with the same key (first wins)", () => {
    const items = [makeCrit("a", 80), makeCrit("a", 90), makeCrit("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.filter((r) => r.key === "a")).toHaveLength(1);
    expect(result.find((r) => r.key === "a")!.score).toBe(80); // first entry wins
  });

  it("caps to 3 items when no prior spec", () => {
    const items = [makeCrit("a", 70), makeCrit("b", 80), makeCrit("c", 75), makeCrit("d", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("locks to prior spec order when prior is provided", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "" },
      { key: "a", label: "A", bestPractice: "" },
    ];
    const items = [makeCrit("a", 90), makeCrit("b", 70)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["b", "a"]);
  });

  it("preserves prior label/bestPractice over model output", () => {
    const prior = [{ key: "x", label: "Official Label", bestPractice: "Official BP" }];
    const items = [{ key: "x", label: "Wrong Label", bestPractice: "Wrong BP", score: 80, rationale: "r", suggestion: "s" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Official Label");
    expect(result[0].bestPractice).toBe("Official BP");
  });

  it("clamps out-of-range scores", () => {
    const items = [makeCrit("a", 999)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result[0].score).toBe(100);
  });
});
