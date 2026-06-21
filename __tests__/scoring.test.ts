import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { CriterionSpec, DynamicCriterion } from "@/lib/types";

describe("clamp", () => {
  it("returns 0 for negative numbers", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(-1)).toBe(0);
  });

  it("returns 0 for exactly 0", () => {
    expect(clamp(0)).toBe(0);
  });

  it("returns 50 for 50", () => {
    expect(clamp(50)).toBe(50);
  });

  it("returns 100 for 100", () => {
    expect(clamp(100)).toBe(100);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(150)).toBe(100);
    expect(clamp(101)).toBe(100);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number types", () => {
    expect(clamp("hello" as unknown as number)).toBe(0);
    expect(clamp(undefined as unknown as number)).toBe(0);
    expect(clamp(null as unknown as number)).toBe(0);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });
});

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the single score for a one-element array", () => {
    expect(computeOverall([75])).toBe(75);
    expect(computeOverall([0])).toBe(0);
    expect(computeOverall([100])).toBe(100);
  });

  it("computes the rounded mean for multiple scores", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
    // 70 + 75 + 80 = 225 / 3 = 75
    expect(computeOverall([70, 75, 80])).toBe(75);
  });

  it("rounds the mean correctly", () => {
    // 70 + 71 = 141 / 2 = 70.5 → rounds to 71
    expect(computeOverall([70, 71])).toBe(71);
    // 70 + 73 = 143 / 2 = 71.5 → rounds to 72
    expect(computeOverall([70, 73])).toBe(72);
  });
});

describe("isReady", () => {
  it("returns false when scores array is empty", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores clear the dimension floor", () => {
    expect(isReady(80, [70, 80, 90], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [70, 80, 90], 80)).toBe(false);
  });

  it("returns false when any score is below the dimension floor (65)", () => {
    // overall is 80 but one score is 64 (below DIMENSION_FLOOR)
    expect(isReady(80, [64, 90, 90], 80)).toBe(false);
  });

  it("returns true when score is exactly at the dimension floor", () => {
    expect(isReady(80, [DIMENSION_FLOOR, 90, 85], 80)).toBe(true);
  });

  it("returns true when overall is exactly at the threshold", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });

  it("returns false when both overall is below threshold and a score is below floor", () => {
    expect(isReady(70, [60, 80, 70], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const makeRaw = (clarityScore = 85, concisenessScore = 75, dynamicScore = 70) => ({
    projectType: "Web app",
    clarity: { score: clarityScore, rationale: "Clear", suggestion: "Keep it up" },
    conciseness: { score: concisenessScore, rationale: "Concise", suggestion: "Good" },
    dynamicCriteria: [
      {
        key: "audience",
        label: "Audience",
        bestPractice: "define_audience",
        score: dynamicScore,
        rationale: "Could be sharper",
        suggestion: "Name the user",
      },
    ],
    refinedPrompt: "Build a web app.",
  });

  it("clamps scores that are out of range", () => {
    const raw = makeRaw(150, -10, 50);
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.dynamicCriteria[0].score).toBe(50);
  });

  it("computes the overall as the rounded mean of all dimension scores", () => {
    // scores: clarity=85, conciseness=75, dynamic=70 → mean = 230/3 ≈ 77
    const raw = makeRaw(85, 75, 70);
    const result = finalizeAssessment(raw);
    expect(result.overall).toBe(Math.round((85 + 75 + 70) / 3));
  });

  it("sets ready=true when overall and floor conditions are met", () => {
    // All scores above 65, and mean >= 80
    const raw = makeRaw(85, 80, 80);
    const result = finalizeAssessment(raw, 80);
    const expectedOverall = Math.round((85 + 80 + 80) / 3);
    expect(result.overall).toBe(expectedOverall);
    expect(result.ready).toBe(expectedOverall >= 80 && Math.min(85, 80, 80) >= 65);
  });

  it("sets ready=false when overall is below threshold", () => {
    const raw = makeRaw(60, 60, 60);
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
    expect(result.overall).toBe(60);
  });

  it("stamps the active threshold on the result", () => {
    const result = finalizeAssessment(makeRaw(), 75);
    expect(result.threshold).toBe(75);
  });

  it("uses the DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(makeRaw());
    // DEFAULT_THRESHOLD is read from env or falls back to 80
    expect(typeof result.threshold).toBe("number");
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeCriterion = (key: string, score = 70): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "test",
    suggestion: "test",
  });

  const makePrior = (keys: string[]): CriterionSpec[] =>
    keys.map((k) => ({ key: k, label: k, bestPractice: k }));

  it("deduplicates by key, keeping the first occurrence", () => {
    const items = [makeCriterion("a", 70), makeCriterion("b", 80), makeCriterion("a", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.filter((r) => r.key === "a")).toHaveLength(1);
    // First occurrence wins
    expect(result.find((r) => r.key === "a")?.score).toBe(70);
  });

  it("caps to 3 items when no prior is supplied", () => {
    const items = ["a", "b", "c", "d", "e"].map(makeCriterion);
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to the prior order and keys when prior is provided", () => {
    const items = [makeCriterion("b", 80), makeCriterion("a", 70)];
    const prior = makePrior(["a", "b"]);
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[1].key).toBe("b");
  });

  it("uses the prior label and bestPractice when a match is found", () => {
    const items = [makeCriterion("mykey", 77)];
    const prior: CriterionSpec[] = [{ key: "mykey", label: "My Label", bestPractice: "my_bp" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("My Label");
    expect(result[0].bestPractice).toBe("my_bp");
    expect(result[0].score).toBe(77);
  });

  it("handles empty input with no prior", () => {
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("handles undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters out items with non-string keys", () => {
    const items = [
      { key: 123 as unknown as string, label: "bad", bestPractice: "bp", score: 70, rationale: "", suggestion: "" },
      makeCriterion("good"),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("good");
  });
});
