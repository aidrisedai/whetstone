import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../scoring";

describe("clamp", () => {
  it("clamps values to 0-100", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.6)).toBe(51);
  });

  it("handles non-numbers gracefully", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the average", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 rounds to 71
  });
});

describe("isReady", () => {
  it("returns true when overall and all dimensions clear thresholds", () => {
    expect(isReady(85, [80, 75, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [80, 75, 70], 80)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [80, 60, 70], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });

  it("requires every dimension to be >= DIMENSION_FLOOR (65)", () => {
    expect(DIMENSION_FLOOR).toBe(65);
    expect(isReady(85, [65, 70, 80], 80)).toBe(true);
    expect(isReady(85, [64, 70, 80], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("extracts clarity, conciseness, and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "", score: 90, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([80, 70, 90]);
  });

  it("clamps scores that are out of range", () => {
    const scores = dimensionScores({
      clarity: { score: 120, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "web app",
    clarity: { score: 85, rationale: "Good", suggestion: "" },
    conciseness: { score: 75, rationale: "OK", suggestion: "" },
    dynamicCriteria: [
      { key: "mkt", label: "Market", bestPractice: "", score: 80, rationale: "", suggestion: "" },
    ],
    refinedPrompt: "Build an app",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 80) / 3)); // 80
  });

  it("sets ready=true when thresholds are met", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low = {
      ...base,
      clarity: { score: 50, rationale: "", suggestion: "" },
      conciseness: { score: 50, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "mkt", label: "Market", bestPractice: "", score: 50, rationale: "", suggestion: "" },
      ],
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key on first assessment (no prior)", () => {
    const items = [
      { key: "mkt", label: "Market", bestPractice: "", score: 80, rationale: "", suggestion: "" },
      { key: "mkt", label: "Market", bestPractice: "", score: 85, rationale: "", suggestion: "" },
      { key: "ux", label: "UX", bestPractice: "", score: 70, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("mkt");
    expect(result[1].key).toBe("ux");
  });

  it("caps to 3 on first assessment", () => {
    const items = ["a", "b", "c", "d"].map((k) => ({
      key: k,
      label: k,
      bestPractice: "",
      score: 70,
      rationale: "",
      suggestion: "",
    }));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior spec order when prior exists", () => {
    const prior = [
      { key: "mkt", label: "Market", bestPractice: "" },
      { key: "ux", label: "UX", bestPractice: "" },
    ];
    const items = [
      { key: "ux", label: "UX", bestPractice: "", score: 90, rationale: "r", suggestion: "s" },
      { key: "mkt", label: "Market", bestPractice: "", score: 75, rationale: "r2", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("mkt");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("ux");
    expect(result[1].score).toBe(90);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
