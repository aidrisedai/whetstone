import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../scoring";
import type { DynamicCriterion } from "../types";

const dynCrit = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "do it well",
  score,
  rationale: "ok",
  suggestion: "improve",
});

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(105)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.6)).toBe(73));
  it("passes values in range through", () => expect(clamp(50)).toBe(50));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
});

describe("computeOverall", () => {
  it("averages scores", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds the average", () => expect(computeOverall([67, 68])).toBe(68));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [dynCrit("originality", 90)],
    });
    expect(scores).toEqual([80, 70, 90]);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all dimensions pass floor", () => {
    expect(isReady(82, [82, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(78, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any dimension is below floor", () => {
    expect(isReady(85, [85, 60, 90], 80)).toBe(false);
  });

  it("returns false when array is empty", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(isReady(80, [80, 65, 80], 80)).toBe(true);
    expect(isReady(80, [80, 64, 80], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "App",
    clarity: { score: 82, rationale: "clear", suggestion: "clearer" },
    conciseness: { score: 78, rationale: "ok", suggestion: "shorter" },
    dynamicCriteria: [dynCrit("feasibility", 90)],
    refinedPrompt: "Build a thing",
  };

  it("computes overall as mean of all dimension scores", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(Math.round((82 + 78 + 90) / 3));
  });

  it("stamps the threshold", () => {
    expect(finalizeAssessment(raw, 75).threshold).toBe(75);
  });

  it("sets ready=true when above threshold and all dimensions pass floor", () => {
    expect(finalizeAssessment(raw, 80).ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const lowRaw = {
      ...raw,
      clarity: { score: 60, rationale: "", suggestion: "" },
      conciseness: { score: 50, rationale: "", suggestion: "" },
      dynamicCriteria: [dynCrit("feasibility", 55)],
    };
    expect(finalizeAssessment(lowRaw, 80).ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const oobRaw = {
      ...raw,
      clarity: { score: 150, rationale: "", suggestion: "" },
    };
    expect(finalizeAssessment(oobRaw).clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates criteria by key", () => {
    const items = [dynCrit("a", 80), dynCrit("a", 70), dynCrit("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first wins
  });

  it("caps first-time result at 3", () => {
    const items = ["a", "b", "c", "d"].map((k) => dynCrit(k, 80));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior criteria order when prior is set", () => {
    const prior = [
      { key: "x", label: "X", bestPractice: "do X" },
      { key: "y", label: "Y", bestPractice: "do Y" },
    ];
    const items = [dynCrit("y", 75), dynCrit("x", 85)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(75);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80 when env var is unset", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
