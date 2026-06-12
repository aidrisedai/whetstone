import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "@/lib/types";

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps to 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.6)).toBe(51);
  });
  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0])).toBe(0);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("rounds the mean", () => {
    expect(computeOverall([67, 68])).toBe(68);
  });
});

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores", () => {
    const result = dimensionScores({
      clarity: makeDim(75),
      conciseness: makeDim(80),
      dynamicCriteria: [makeDynamic("k1", 70), makeDynamic("k2", 90)],
    });
    expect(result).toEqual([75, 80, 70, 90]);
  });
  it("clamps each value", () => {
    const result = dimensionScores({
      clarity: makeDim(150),
      conciseness: makeDim(-5),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  const threshold = 80;
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(82, [82, 70, 75], threshold)).toBe(true);
  });
  it("returns false when overall < threshold", () => {
    expect(isReady(79, [79, 80, 80], threshold)).toBe(false);
  });
  it("returns false when any score < DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, 85, 64], threshold)).toBe(false);
  });
  it("returns false for empty scores", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });
  it("uses exact floor boundary", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR], threshold)).toBe(true);
    expect(isReady(80, [80, DIMENSION_FLOOR - 1], threshold)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Web app",
    clarity: makeDim(85),
    conciseness: makeDim(75),
    dynamicCriteria: [makeDynamic("audience", 70)],
    refinedPrompt: "Build it",
  };

  it("computes overall as the mean of all dimensions", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(Math.round((85 + 75 + 70) / 3));
  });

  it("stamps the active threshold", () => {
    expect(finalizeAssessment(raw, 75).threshold).toBe(75);
  });

  it("marks ready when score crosses threshold", () => {
    const highRaw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...raw,
      clarity: makeDim(90),
      conciseness: makeDim(85),
      dynamicCriteria: [makeDynamic("audience", 80)],
    };
    expect(finalizeAssessment(highRaw, 80).ready).toBe(true);
  });

  it("marks not ready when score is below threshold", () => {
    expect(finalizeAssessment(raw, 80).ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const raw2 = { ...raw, clarity: makeDim(120), conciseness: makeDim(-5) };
    const a = finalizeAssessment(raw2, 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when no threshold is passed", () => {
    const a = finalizeAssessment(raw);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "a", label: "A", bestPractice: "bp_a" },
    { key: "b", label: "B", bestPractice: "bp_b" },
  ];

  it("dedupes by key when no prior exists", () => {
    const items = [makeDynamic("a", 70), makeDynamic("a", 80), makeDynamic("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 when no prior", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeDynamic(k, 50));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior specs and preserves their order", () => {
    const items = [makeDynamic("b", 75), makeDynamic("a", 65)];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(65);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(75);
  });

  it("uses spec metadata (label/bestPractice) from prior, not from items", () => {
    const items = [{ ...makeDynamic("a", 80), label: "Wrong label", bestPractice: "wrong" }];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].label).toBe("A");
    expect(result[0].bestPractice).toBe("bp_a");
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(null as unknown as DynamicCriterion[], null)).toEqual([]);
  });

  it("falls back to position-indexed item when prior key has no match", () => {
    const items = [makeDynamic("x", 55)]; // key "x" doesn't match prior "a" or "b"
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].key).toBe("a"); // spec key preserved
    expect(result[0].score).toBe(55); // score from the positional fallback item
  });
});
