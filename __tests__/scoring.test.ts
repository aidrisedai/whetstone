import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  DIMENSION_FLOOR,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "../lib/scoring";

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
  it("passes through valid values", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value unchanged", () => expect(computeOverall([70])).toBe(70));
  it("averages multiple scores", () => expect(computeOverall([80, 90, 70])).toBe(80));
  it("rounds the result", () => expect(computeOverall([80, 81])).toBe(81));
});

describe("isReady", () => {
  it("returns false when overall is below threshold", () =>
    expect(isReady(75, [80, 80, 80], 80)).toBe(false));

  it("returns false when a dimension is below the floor", () =>
    expect(isReady(85, [90, 90, 60], 80)).toBe(false));

  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));

  it("returns true when all conditions met", () =>
    expect(isReady(85, [85, 90, 80], 80)).toBe(true));

  it("returns true at exact threshold with all dimensions at floor", () =>
    expect(isReady(80, [DIMENSION_FLOOR, DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [{ key: "a", label: "A", bestPractice: "", score: 90, rationale: "", suggestion: "" }],
    });
    expect(scores).toEqual([80, 70, 90]);
  });

  it("clamps out-of-range scores", () => {
    const scores = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("normalizeDynamicCriteria", () => {
  const criterion = (key: string, score: number) => ({
    key,
    label: key,
    bestPractice: "",
    score,
    rationale: "",
    suggestion: "",
  });

  it("deduplicates by key (first occurrence wins)", () => {
    const result = normalizeDynamicCriteria(
      [criterion("a", 80), criterion("a", 90), criterion("b", 70)],
      null,
    );
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 criteria when prior is null", () => {
    const result = normalizeDynamicCriteria(
      [criterion("a", 80), criterion("b", 70), criterion("c", 60), criterion("d", 50)],
      null,
    );
    expect(result).toHaveLength(3);
  });

  it("locks to prior order and keys when prior is set", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "" },
      { key: "b", label: "B", bestPractice: "" },
    ];
    const result = normalizeDynamicCriteria(
      [criterion("b", 75), criterion("a", 85)],
      prior,
    );
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(75);
  });

  it("handles undefined gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    refinedPrompt: "Build a test app",
    clarity: { score: 90, rationale: "clear", suggestion: "" },
    conciseness: { score: 80, rationale: "concise", suggestion: "" },
    dynamicCriteria: [
      { key: "x", label: "X", bestPractice: "", score: 75, rationale: "", suggestion: "" },
    ],
  };

  it("computes overall as the mean", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((90 + 80 + 75) / 3));
  });

  it("marks ready when overall >= threshold and all dimensions clear floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("marks not ready when overall is below threshold", () => {
    const low = { ...base, clarity: { ...base.clarity, score: 50 } };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the supplied threshold", () => {
    const result = finalizeAssessment(base, 90);
    expect(result.threshold).toBe(90);
  });
});
