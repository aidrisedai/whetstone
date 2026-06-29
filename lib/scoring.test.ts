import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "./scoring";

describe("clamp", () => {
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("clamps below 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100", () => expect(clamp(105)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("passes through in-range values unchanged", () => expect(clamp(50)).toBe(50));
  it("handles non-number gracefully", () => expect(clamp("x" as unknown as number)).toBe(0));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages two values", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([70, 71])).toBe(71));
  it("handles a single value", () => expect(computeOverall([75])).toBe(75));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(80, [], 80)).toBe(false));

  it("returns true when overall >= threshold and all scores >= floor", () =>
    expect(isReady(80, [65, 70, 80], 80)).toBe(true));

  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [65, 70, 80], 80)).toBe(false));

  it("returns false when one score is below DIMENSION_FLOOR", () =>
    expect(isReady(80, [64, 70, 80], 80)).toBe(false));

  it("returns true at the exact floor value", () =>
    expect(isReady(80, [65, 65, 65], 80)).toBe(true));

  it("uses the provided threshold, not the default", () =>
    expect(isReady(70, [65, 70], 70)).toBe(true));
});

describe("dimensionScores", () => {
  it("returns clarity, conciseness, then dynamic scores", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "p", score: 60, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([80, 70, 60]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: { score: 999, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    refinedPrompt: "Build a todo app",
    dynamicCriteria: [] as ReturnType<typeof normalizeDynamicCriteria>,
  };

  it("clamps out-of-range scores", () => {
    const a = finalizeAssessment({
      ...base,
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
    });
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("computes overall as the mean of all dimension scores", () => {
    const a = finalizeAssessment({
      ...base,
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 60, rationale: "", suggestion: "" },
    });
    expect(a.overall).toBe(70);
  });

  it("stamps the active threshold", () => {
    const a = finalizeAssessment(
      {
        ...base,
        clarity: { score: 80, rationale: "", suggestion: "" },
        conciseness: { score: 80, rationale: "", suggestion: "" },
      },
      75,
    );
    expect(a.threshold).toBe(75);
  });

  it("sets ready=true when conditions are met", () => {
    const a = finalizeAssessment({
      ...base,
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
    });
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall is under threshold", () => {
    const a = finalizeAssessment({
      ...base,
      clarity: { score: 60, rationale: "", suggestion: "" },
      conciseness: { score: 60, rationale: "", suggestion: "" },
    });
    expect(a.ready).toBe(false);
  });

  it("sets ready=false when a dynamic dimension is below the floor", () => {
    const a = finalizeAssessment({
      ...base,
      clarity: { score: 90, rationale: "", suggestion: "" },
      conciseness: { score: 90, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k", label: "K", bestPractice: "p", score: 60, rationale: "", suggestion: "" },
      ],
    });
    expect(a.ready).toBe(false);
  });

  it("uses DEFAULT_THRESHOLD when none is provided", () => {
    const a = finalizeAssessment({
      ...base,
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
    });
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("returns empty array for empty input", () =>
    expect(normalizeDynamicCriteria([], null)).toEqual([]));

  it("handles undefined input gracefully", () =>
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]));

  it("dedupes by key, keeping the first occurrence", () => {
    const items = [
      { key: "a", label: "A", bestPractice: "p", score: 70, rationale: "r", suggestion: "s" },
      { key: "a", label: "A dup", bestPractice: "p2", score: 90, rationale: "r2", suggestion: "s2" },
      { key: "b", label: "B", bestPractice: "p", score: 60, rationale: "r", suggestion: "s" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70);
    expect(result[1].key).toBe("b");
  });

  it("caps to 3 items on the first assessment", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: "p",
      score: 70,
      rationale: "",
      suggestion: "",
    }));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks labels/bestPractice to prior on subsequent assessments", () => {
    const prior = [
      { key: "clarity", label: "Clarity", bestPractice: "be clear" },
      { key: "scope", label: "Scope", bestPractice: "define scope" },
    ];
    const items = [
      {
        key: "clarity",
        label: "Clarity UPDATED",
        bestPractice: "new bp",
        score: 75,
        rationale: "r",
        suggestion: "s",
      },
      {
        key: "scope",
        label: "Scope",
        bestPractice: "define scope",
        score: 85,
        rationale: "r2",
        suggestion: "s2",
      },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("Clarity");
    expect(result[0].bestPractice).toBe("be clear");
    expect(result[0].score).toBe(75);
    expect(result[1].score).toBe(85);
  });

  it("clamps scores when prior criteria are locked in", () => {
    const prior = [{ key: "k", label: "K", bestPractice: "p" }];
    const items = [
      { key: "k", label: "K", bestPractice: "p", score: 999, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].score).toBe(100);
  });

  it("returns raw (unclamped) scores on first assessment — clamping happens in finalizeAssessment", () => {
    const items = [
      { key: "k", label: "K", bestPractice: "p", score: 999, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result[0].score).toBe(999);
  });

  it("returns DIMENSION_FLOOR as the lowest valid score gate constant", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
