import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { Assessment, DynamicCriterion } from "@/lib/types";

describe("clamp", () => {
  it("clamps values to 0–100", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(50)).toBe(50);
    expect(clamp(NaN)).toBe(0);
  });

  it("rounds to integer", () => {
    expect(clamp(72.7)).toBe(73);
    expect(clamp(72.2)).toBe(72);
  });
});

describe("computeOverall", () => {
  it("returns the mean", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
    expect(computeOverall([100, 0])).toBe(50);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor (65)", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });

  it("returns false when any score is below the floor (65)", () => {
    expect(isReady(80, [80, 64, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("is 80 by default", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});

const mockDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "test",
  suggestion: "test",
});

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: { score: 70, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: [mockDynamic("core_mechanic", 90)],
    });
    expect(scores).toEqual([70, 80, 90]);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key", () => {
    const items = [mockDynamic("clarity", 80), mockDynamic("clarity", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 items on first assessment (no prior)", () => {
    const items = [
      mockDynamic("a", 80),
      mockDynamic("b", 70),
      mockDynamic("c", 60),
      mockDynamic("d", 50),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("reuses prior criteria order and fills missing keys from new items", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "a" },
      { key: "b", label: "B", bestPractice: "b" },
    ];
    const items = [mockDynamic("b", 75), mockDynamic("a", 85)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(75);
  });

  it("handles null/undefined items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});

describe("finalizeAssessment", () => {
  const makeRaw = (overrides?: Partial<Omit<Assessment, "overall" | "ready" | "threshold">>) => ({
    projectType: "game",
    clarity: { score: 80, rationale: "ok", suggestion: "none" },
    conciseness: { score: 85, rationale: "ok", suggestion: "none" },
    dynamicCriteria: [mockDynamic("core_mechanic", 90)],
    refinedPrompt: "build X",
    ...overrides,
  });

  it("computes overall as mean of all scores", () => {
    const result = finalizeAssessment(makeRaw());
    expect(result.overall).toBe(Math.round((80 + 85 + 90) / 3));
  });

  it("sets ready = true when all conditions met", () => {
    const result = finalizeAssessment(makeRaw());
    expect(result.ready).toBe(true);
  });

  it("sets ready = false when score below floor", () => {
    const result = finalizeAssessment(
      makeRaw({ clarity: { score: 60, rationale: "", suggestion: "" } })
    );
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment(
      makeRaw({ clarity: { score: 150, rationale: "", suggestion: "" } })
    );
    expect(result.clarity.score).toBe(100);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(makeRaw(), 75);
    expect(result.threshold).toBe(75);
  });
});
