import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "./scoring";
import type { DynamicCriterion } from "./types";

const mockDim = (score: number) => ({
  score,
  rationale: "test",
  suggestion: "test",
});

const mockDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "test",
  suggestion: "test",
});

describe("clamp", () => {
  it("clamps values to 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
    expect(clamp(100)).toBe(100);
    expect(clamp(0)).toBe(0);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
    expect(clamp(99.9)).toBe(100);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores correctly", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
    expect(computeOverall([100])).toBe(100);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([70, 71])).toBe(71);
  });
});

describe("isReady", () => {
  it("returns true when overall ≥ threshold AND all dimensions ≥ floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
    expect(isReady(95, [90, 85, 80], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });

  it("returns false when any dimension is below the floor", () => {
    expect(isReady(80, [80, 80, 64], 80)).toBe(false);
    expect(isReady(90, [90, 90, 60], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("uses DIMENSION_FLOOR (65) as the per-dimension gate", () => {
    expect(DIMENSION_FLOOR).toBe(65);
    expect(isReady(80, [80, 80, 65], 80)).toBe(true);
    expect(isReady(80, [80, 80, 64], 80)).toBe(false);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("defaults to 80 when env is not set", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});

describe("finalizeAssessment", () => {
  const rawBase = {
    projectType: "App",
    clarity: mockDim(85),
    conciseness: mockDim(75),
    dynamicCriteria: [mockDynamic("audience", 80)],
    refinedPrompt: "Build a todo app",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(rawBase, 80);
    // scores: [85, 75, 80] → mean = 80
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when threshold is met and all dims pass floor", () => {
    const result = finalizeAssessment(rawBase, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when below threshold", () => {
    const low = { ...rawBase, clarity: mockDim(60), conciseness: mockDim(55), dynamicCriteria: [mockDynamic("a", 50)] };
    const result = finalizeAssessment(low, 80);
    expect(result.overall).toBe(55);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment(
      { ...rawBase, clarity: mockDim(110), conciseness: mockDim(-5), dynamicCriteria: [mockDynamic("a", 80)] },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(rawBase, 90);
    expect(result.threshold).toBe(90);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    mockDynamic("audience", 70),
    mockDynamic("scope", 80),
    mockDynamic("mechanic", 90),
    mockDynamic("extra", 60),
  ];

  it("caps to 3 items on the first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const dup = [...items, mockDynamic("audience", 50)];
    const result = normalizeDynamicCriteria(dup, null);
    expect(result.filter((r) => r.key === "audience")).toHaveLength(1);
    expect(result.find((r) => r.key === "audience")?.score).toBe(70); // first wins
  });

  it("locks to prior criteria keys and picks latest scores", () => {
    const prior = [
      { key: "audience", label: "Audience", bestPractice: "audience" },
      { key: "scope", label: "Scope", bestPractice: "scope" },
    ];
    const updated: DynamicCriterion[] = [
      mockDynamic("audience", 88),
      mockDynamic("scope", 92),
    ];
    const result = normalizeDynamicCriteria(updated, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(88);
    expect(result[1].score).toBe(92);
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
