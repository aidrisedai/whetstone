import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  DEFAULT_THRESHOLD,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

describe("clamp", () => {
  it("clamps values to 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.6)).toBe(51);
  });

  it("handles invalid inputs", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp(Infinity)).toBe(100);
    expect(clamp(-Infinity)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([100, 80, 60])).toBe(80);
    expect(computeOverall([70, 70, 70])).toBe(70);
  });

  it("rounds to integer", () => {
    expect(computeOverall([67, 68])).toBe(68); // 67.5 rounded
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles single score", () => {
    expect(computeOverall([85])).toBe(85);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores above floor", () => {
    expect(isReady(85, [85, 80, 75, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [75, 85, 85, 85], 80)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR (65)", () => {
    expect(isReady(85, [85, 90, 60, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(isReady(70, [70, 75, 70], 70)).toBe(true);
    expect(isReady(70, [70, 75, 70], 75)).toBe(false);
  });
});

const fakeDimension = (score: number) => ({
  score,
  rationale: "test",
  suggestion: "test",
});

const fakeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "test",
  suggestion: "test",
});

describe("dimensionScores", () => {
  it("returns clamped scores for all dimensions", () => {
    const result = dimensionScores({
      clarity: fakeDimension(80),
      conciseness: fakeDimension(90),
      dynamicCriteria: [fakeDynamic("k1", 70), fakeDynamic("k2", 105)],
    });
    expect(result).toEqual([80, 90, 70, 100]);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: fakeDimension(85),
    conciseness: fakeDimension(80),
    dynamicCriteria: [fakeDynamic("define_audience", 90)],
    refinedPrompt: "Build something.",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((85 + 80 + 90) / 3));
  });

  it("sets ready to true when threshold is met and floor is cleared", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready to false when score is below threshold", () => {
    const lowRaw = { ...raw, clarity: fakeDimension(50), conciseness: fakeDimension(50), dynamicCriteria: [fakeDynamic("k", 50)] };
    const result = finalizeAssessment(lowRaw, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores", () => {
    const outOfRange = { ...raw, clarity: fakeDimension(150) };
    const result = finalizeAssessment(outOfRange, 80);
    expect(result.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    fakeDynamic("key_a", 70),
    fakeDynamic("key_b", 80),
    fakeDynamic("key_a", 90), // duplicate — should be deduped
  ];

  it("deduplicates by key (first wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["key_a", "key_b"]);
    expect(result[0].score).toBe(70); // first occurrence
  });

  it("caps to 3 on first assessment", () => {
    const many: DynamicCriterion[] = ["a", "b", "c", "d"].map((k) => fakeDynamic(k, 80));
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior criteria order when prior is set", () => {
    const prior = [
      { key: "key_b", label: "Key B", bestPractice: "key_b" },
      { key: "key_a", label: "Key A", bestPractice: "key_a" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("key_b");
    expect(result[0].score).toBe(80);
    expect(result[1].key).toBe("key_a");
    expect(result[1].score).toBe(70);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("defaults to 80 when env var is not set", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});
