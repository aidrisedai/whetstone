import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

describe("clamp", () => {
  it("clamps values to [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(74.6)).toBe(75);
    expect(clamp(74.4)).toBe(74);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns single value unchanged", () => {
    expect(computeOverall([80])).toBe(80);
  });

  it("averages evenly", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("rounds fractional averages", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 rounds to 71
  });
});

describe("isReady", () => {
  const threshold = DEFAULT_THRESHOLD; // 80

  it("returns false with empty scores", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });

  it("returns true when overall meets threshold and all dimensions clear floor", () => {
    expect(isReady(80, [80, 75, 70], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], threshold)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [90, 90, DIMENSION_FLOOR - 1], threshold)).toBe(false);
  });

  it("passes exactly at the floor boundary", () => {
    expect(isReady(80, [80, 80, DIMENSION_FLOOR], threshold)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    refinedPrompt: "Build a quiz app",
    projectType: "web" as const,
    clarity: { score: 85, rationale: "Clear", suggestion: "Good" },
    conciseness: { score: 90, rationale: "Tight", suggestion: "Fine" },
    dynamicCriteria: [
      {
        key: "define_audience",
        label: "Audience",
        bestPractice: "Specify who uses this",
        score: 75,
        rationale: "Decent",
        suggestion: "Be more specific",
      },
    ],
  };

  it("computes overall as mean of all scores", () => {
    const result = finalizeAssessment(base);
    // (85 + 90 + 75) / 3 = 83.33 → 83
    expect(result.overall).toBe(83);
  });

  it("sets ready=true when overall and all dimensions pass gate", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low = {
      ...base,
      clarity: { ...base.clarity, score: 50 },
      conciseness: { ...base.conciseness, score: 55 },
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const extreme = {
      ...base,
      clarity: { ...base.clarity, score: 150 },
      conciseness: { ...base.conciseness, score: -10 },
    };
    const result = finalizeAssessment(extreme, 80);
    // clarity → 100, conciseness → 0, dynamic → 75; mean = (100+0+75)/3 = 58
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(58);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeItem = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: "bp",
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates by key (first occurrence wins)", () => {
    const items = [makeItem("a", 70), makeItem("a", 90), makeItem("b", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 items on first assessment (no prior)", () => {
    const items = [makeItem("a", 70), makeItem("b", 75), makeItem("c", 80), makeItem("d", 85)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks order and keys to prior criteria", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "bp-b" },
      { key: "a", label: "A", bestPractice: "bp-a" },
    ];
    const items = [makeItem("a", 70), makeItem("b", 80)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("b");
    expect(result[0].score).toBe(80);
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(70);
  });

  it("uses prior label and bestPractice even if model echoes different ones", () => {
    const prior = [{ key: "a", label: "CorrectLabel", bestPractice: "CorrectBP" }];
    const items = [{ ...makeItem("a", 75), label: "WrongLabel", bestPractice: "WrongBP" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("CorrectLabel");
    expect(result[0].bestPractice).toBe("CorrectBP");
  });

  it("falls back gracefully when item array is undefined", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("uses score 0 when prior key has no match in items", () => {
    const prior = [{ key: "missing", label: "Missing", bestPractice: "bp" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].score).toBe(0);
  });
});
