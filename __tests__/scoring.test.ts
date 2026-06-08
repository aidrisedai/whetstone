import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

describe("clamp", () => {
  it("passes through values in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds to integer", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number", () => {
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the single value for a one-element array", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("computes the mean and rounds", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([80, 60, 70])).toBe(70);
  });

  it("rounds 0.5 up", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 rounds to 81
  });
});

describe("isReady", () => {
  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("returns true when overall >= threshold AND all scores >= floor", () => {
    const scores = [80, 70, 70];
    expect(isReady(73, scores, 70)).toBe(true);
  });

  it("returns false when overall < threshold", () => {
    const scores = [80, 80, 80];
    expect(isReady(79, scores, 80)).toBe(false);
  });

  it("returns false when any score < DIMENSION_FLOOR", () => {
    const scores = [90, 64, 90]; // 64 < 65 (DIMENSION_FLOOR)
    expect(isReady(81, scores, 80)).toBe(false);
  });

  it("returns true when all scores exactly meet floor and threshold", () => {
    const scores = [80, DIMENSION_FLOOR, DIMENSION_FLOOR];
    const overall = computeOverall(scores);
    expect(isReady(overall, scores, overall)).toBe(true);
  });
});

describe("dimensionScores", () => {
  it("returns clamped scores for all dimensions", () => {
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 120, rationale: "", suggestion: "" },
      dynamicCriteria: [{ key: "a", label: "A", bestPractice: "", score: -5, rationale: "", suggestion: "" }],
    });
    expect(result).toEqual([80, 100, 0]);
  });

  it("returns only the two fixed dimensions when dynamic is empty", () => {
    const result = dimensionScores({
      clarity: { score: 75, rationale: "", suggestion: "" },
      conciseness: { score: 85, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([75, 85]);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "game",
    clarity: { score: 80, rationale: "clear", suggestion: "" },
    conciseness: { score: 70, rationale: "concise", suggestion: "" },
    dynamicCriteria: [
      { key: "fun", label: "Fun", bestPractice: "make it fun", score: 75, rationale: "fun", suggestion: "" },
    ],
    refinedPrompt: "build a game",
  };

  it("clamps out-of-range scores", () => {
    const raw = {
      ...baseRaw,
      clarity: { score: 110, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw);
    expect(result.overall).toBe(computeOverall([80, 70, 75]));
  });

  it("sets ready deterministically based on threshold", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.threshold).toBe(80);
    expect(result.ready).toBe(isReady(result.overall, dimensionScores(result), 80));
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(baseRaw, 90);
    expect(result.threshold).toBe(90);
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeItem = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key.toUpperCase(),
    bestPractice: `bp-${key}`,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("deduplicates by key", () => {
    const items = [makeItem("a", 80), makeItem("a", 90), makeItem("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(80); // first occurrence wins
  });

  it("caps to 3 items on first assessment (no prior)", () => {
    const items = [makeItem("a", 80), makeItem("b", 70), makeItem("c", 60), makeItem("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior keys when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "A", bestPractice: "bp-a" },
      { key: "b", label: "B", bestPractice: "bp-b" },
    ];
    const items = [makeItem("b", 75), makeItem("a", 85), makeItem("c", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(85);
    expect(result[1].score).toBe(75);
  });

  it("uses prior labels and bestPractice even when model updates them", () => {
    const prior: CriterionSpec[] = [{ key: "a", label: "Original Label", bestPractice: "original bp" }];
    const items = [{ ...makeItem("a", 80), label: "New Label", bestPractice: "new bp" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Original Label");
    expect(result[0].bestPractice).toBe("original bp");
  });

  it("falls back to zero score for a prior key missing from model output", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "A", bestPractice: "bp-a" },
      { key: "missing", label: "Missing", bestPractice: "bp-missing" },
    ];
    const items = [makeItem("a", 80)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[1].key).toBe("missing");
    expect(result[1].score).toBe(0);
  });

  it("filters out malformed items (non-string key)", () => {
    const items = [{ key: 123 as unknown as string, label: "bad", score: 80, rationale: "", suggestion: "", bestPractice: "" }];
    expect(normalizeDynamicCriteria(items, null)).toEqual([]);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("defaults to 80 when env var is unset", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});
