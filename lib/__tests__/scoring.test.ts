import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

describe("clamp", () => {
  it("returns value unchanged within 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.6)).toBe(51);
  });

  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 → rounds to 81 (Math.round)
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });

  it("returns false when any score is below floor (65)", () => {
    expect(isReady(80, [80, 80, 64], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 75)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("returns clamped scores for clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "L1", bestPractice: "bp", score: 90, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([80, 70, 90]);
  });

  it("clamps out-of-range values", () => {
    const scores = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const baseDynamic: DynamicCriterion = {
    key: "k1",
    label: "Label",
    bestPractice: "bp",
    score: 80,
    rationale: "r",
    suggestion: "s",
  };

  const raw = {
    projectType: "App",
    clarity: { score: 80, rationale: "r", suggestion: "s" },
    conciseness: { score: 80, rationale: "r", suggestion: "s" },
    dynamicCriteria: [baseDynamic],
    refinedPrompt: "build something",
  };

  it("computes correct overall mean", () => {
    const result = finalizeAssessment(raw);
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when overall meets threshold", () => {
    const result = finalizeAssessment(raw);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when below threshold", () => {
    const lowRaw = {
      ...raw,
      clarity: { score: 50, rationale: "", suggestion: "" },
      conciseness: { score: 50, rationale: "", suggestion: "" },
      dynamicCriteria: [{ ...baseDynamic, score: 50 }],
    };
    const result = finalizeAssessment(lowRaw);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps scores that are out of range", () => {
    const highRaw = {
      ...raw,
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [{ ...baseDynamic, score: 80 }],
    };
    const result = finalizeAssessment(highRaw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeItem = (key: string, score: number): DynamicCriterion => ({
    key,
    label: `Label ${key}`,
    bestPractice: "bp",
    score,
    rationale: "",
    suggestion: "",
  });

  it("dedupes by key on first assessment", () => {
    const items = [makeItem("a", 80), makeItem("a", 90), makeItem("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first wins in dedup
  });

  it("caps to 3 items on first assessment", () => {
    const items = [makeItem("a", 80), makeItem("b", 70), makeItem("c", 60), makeItem("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior spec keys when prior exists", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "Label a", bestPractice: "bp" },
      { key: "b", label: "Label b", bestPractice: "bp" },
    ];
    const items = [makeItem("a", 90), makeItem("b", 85), makeItem("c", 70)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(90);
  });

  it("handles empty items gracefully", () => {
    const result = normalizeDynamicCriteria([], null);
    expect(result).toEqual([]);
  });

  it("handles undefined items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("defaults DEFAULT_THRESHOLD to 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
