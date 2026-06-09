import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

describe("clamp", () => {
  it("passes values in range", () => expect(clamp(50)).toBe(50));
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(105)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles exact boundaries", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns sole value for single-element array", () => expect(computeOverall([70])).toBe(70));
  it("averages multiple scores", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([33, 33, 34])).toBe(33));
});

describe("isReady", () => {
  const threshold = 80;

  it("returns false for empty scores", () => expect(isReady(90, [], threshold)).toBe(false));
  it("returns true when overall meets threshold and all scores clear floor", () => {
    expect(isReady(85, [85, 70, 80], threshold)).toBe(true);
  });
  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [75, 80, 70], threshold)).toBe(false);
  });
  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [90, 64, 90], threshold)).toBe(false);
  });
  it("is true at exact threshold with all scores exactly at floor", () => {
    expect(isReady(threshold, [threshold, DIMENSION_FLOOR, DIMENSION_FLOOR], threshold)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    summary: "Test idea",
    clarity: { score: 72.4, rationale: "clear", suggestion: "more detail" },
    conciseness: { score: 101, rationale: "concise", suggestion: "" },
    dynamicCriteria: [
      { key: "impact", label: "Impact", bestPractice: "reach", score: -5, rationale: "", suggestion: "" },
    ],
    lesson: "Good job",
  };

  it("clamps scores out of range", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.clarity.score).toBe(72);
    expect(result.conciseness.score).toBe(100);
    expect(result.dynamicCriteria[0].score).toBe(0);
  });

  it("computes correct overall", () => {
    const result = finalizeAssessment(base, 80);
    // scores: 72, 100, 0 → mean 57.33 → 57
    expect(result.overall).toBe(57);
  });

  it("stamps threshold onto assessment", () => {
    expect(finalizeAssessment(base, 90).threshold).toBe(90);
  });

  it("sets ready=true when conditions are met", () => {
    const highBase = {
      ...base,
      clarity: { score: 90, rationale: "", suggestion: "" },
      conciseness: { score: 85, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "impact", label: "Impact", bestPractice: "", score: 80, rationale: "", suggestion: "" },
      ],
    };
    expect(finalizeAssessment(highBase, 80).ready).toBe(true);
  });
});

describe("normalizeDynamicCriteria", () => {
  const mkCrit = (key: string, score = 70): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: "",
    score,
    rationale: "",
    suggestion: "",
  });

  it("deduplicates repeated keys", () => {
    const items = [mkCrit("a"), mkCrit("a"), mkCrit("b")];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
  });

  it("caps to 3 when no prior", () => {
    const items = [mkCrit("a"), mkCrit("b"), mkCrit("c"), mkCrit("d")];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior spec order and keys", () => {
    const prior = [
      { key: "x", label: "X", bestPractice: "bp-x" },
      { key: "y", label: "Y", bestPractice: "bp-y" },
    ];
    const items = [mkCrit("y", 80), mkCrit("x", 90), mkCrit("z", 50)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(90);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(80);
  });

  it("uses prior metadata (label/bestPractice), not model's", () => {
    const prior = [{ key: "k", label: "OrigLabel", bestPractice: "OrigBP" }];
    const items = [{ ...mkCrit("k"), label: "NewLabel", bestPractice: "NewBP" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("OrigLabel");
    expect(result[0].bestPractice).toBe("OrigBP");
  });

  it("handles undefined input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
