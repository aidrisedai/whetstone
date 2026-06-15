import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
  dimensionScores,
  normalizeDynamicCriteria,
  finalizeAssessment,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec, Assessment } from "../lib/types";

describe("clamp", () => {
  it("clamps values below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps values above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds decimals", () => expect(clamp(72.7)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through values in range", () => expect(clamp(75)).toBe(75));
  it("accepts 0 and 100 boundaries", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns value for single element", () => expect(computeOverall([80])).toBe(80));
  it("averages multiple scores", () => expect(computeOverall([60, 80, 100])).toBe(80));
  it("rounds the average", () => expect(computeOverall([70, 71])).toBe(71));
});

describe("isReady", () => {
  const threshold = 80;

  it("returns false for empty scores", () => expect(isReady(80, [], threshold)).toBe(false));
  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [79, 79, 79], threshold)).toBe(false));
  it("returns false when a dimension is below the floor", () =>
    expect(isReady(80, [80, 80, 64], threshold)).toBe(false));
  it("returns true when overall meets threshold and all dimensions clear the floor", () =>
    expect(isReady(80, [80, 80, 65], threshold)).toBe(true));
  it("uses the floor exactly at 65", () => {
    expect(isReady(80, [80, 65], threshold)).toBe(true);
    expect(isReady(80, [80, 64], threshold)).toBe(false);
  });
  it("uses the supplied threshold, not the default", () =>
    expect(isReady(70, [70, 70, 70], 70)).toBe(true));
});

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});

describe("DEFAULT_THRESHOLD", () => {
  it("is 80 (no env override in test)", () => expect(DEFAULT_THRESHOLD).toBe(80));
});

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores in order", () => {
    const result = dimensionScores({
      clarity: { score: 90, rationale: "", suggestion: "" },
      conciseness: { score: 75, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "", score: 60, rationale: "", suggestion: "" },
        { key: "b", label: "B", bestPractice: "", score: 110, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([90, 75, 60, 100]);
  });
});

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "",
  score,
  rationale: "",
  suggestion: "",
});

const makeSpec = (key: string): CriterionSpec => ({
  key,
  label: key,
  bestPractice: "",
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key, keeping first occurrence", () => {
    const result = normalizeDynamicCriteria(
      [makeDynamic("a", 70), makeDynamic("a", 80), makeDynamic("b", 90)],
      null,
    );
    expect(result.length).toBe(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70);
  });

  it("caps at 3 on first assessment (no prior)", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeDynamic(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior spec order when prior is set", () => {
    const prior = [makeSpec("x"), makeSpec("y")];
    const items = [makeDynamic("y", 88), makeDynamic("x", 55)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["x", "y"]);
    expect(result[0].score).toBe(55);
    expect(result[1].score).toBe(88);
  });

  it("handles undefined / non-array items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("clamps out-of-range scores when locking to prior", () => {
    const prior = [makeSpec("a")];
    const result = normalizeDynamicCriteria([makeDynamic("a", 150)], prior);
    expect(result[0].score).toBe(100);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "web",
    clarity: { score: 85, rationale: "Clear goal", suggestion: "Good" },
    conciseness: { score: 70, rationale: "Tight", suggestion: "Fine" },
    dynamicCriteria: [
      { key: "audience", label: "Audience", bestPractice: "", score: 75, rationale: "", suggestion: "" },
    ],
    refinedPrompt: "Build a todo app",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((85 + 70 + 75) / 3));
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(raw, 90);
    expect(result.ready).toBe(false);
  });

  it("sets ready=true when all conditions are met", () => {
    const highRaw = {
      ...raw,
      clarity: { score: 85, rationale: "", suggestion: "" },
      conciseness: { score: 82, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "", score: 80, rationale: "", suggestion: "" },
      ],
    };
    const result = finalizeAssessment(highRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range raw scores", () => {
    const outOfRange = {
      ...raw,
      clarity: { score: -5, rationale: "", suggestion: "" },
      conciseness: { score: 200, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(outOfRange, 80);
    expect(result.clarity.score).toBe(0);
    expect(result.conciseness.score).toBe(100);
  });
});
