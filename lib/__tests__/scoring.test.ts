import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../scoring";
import type { Assessment, DynamicCriterion } from "../types";

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps to 0–100", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(75.6)).toBe(76);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("averages scores correctly", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([60, 70, 80])).toBe(70);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("dimensionScores", () => {
  it("includes fixed + dynamic scores", () => {
    const scores = dimensionScores({
      clarity: makeDim(80),
      conciseness: makeDim(90),
      dynamicCriteria: [makeDynamic("audience", 70)],
    });
    expect(scores).toEqual([80, 90, 70]);
  });

  it("clamps all scores", () => {
    const scores = dimensionScores({
      clarity: makeDim(150),
      conciseness: makeDim(-5),
      dynamicCriteria: [makeDynamic("audience", 110)],
    });
    expect(scores).toEqual([100, 0, 100]);
  });
});

describe("isReady", () => {
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores clear floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });

  it("returns false when a dimension is below the floor", () => {
    expect(isReady(85, [85, 85, 60], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Game",
    clarity: makeDim(80),
    conciseness: makeDim(85),
    dynamicCriteria: [makeDynamic("core_mechanic", 75)],
    refinedPrompt: "Build a game",
  };

  it("computes overall as mean of all scores", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((80 + 85 + 75) / 3));
  });

  it("marks as ready when threshold is crossed and floor is cleared", () => {
    const result = finalizeAssessment(raw, 70);
    expect(result.ready).toBe(true);
  });

  it("marks as not ready when threshold is not crossed", () => {
    const result = finalizeAssessment(raw, 85);
    expect(result.ready).toBe(false);
  });

  it("stamps the correct threshold", () => {
    const result = finalizeAssessment(raw, 77);
    expect(result.threshold).toBe(77);
  });

  it("clamps out-of-range scores before computing", () => {
    const rawClamped = {
      ...raw,
      clarity: makeDim(200),
      conciseness: makeDim(-10),
    };
    const result = finalizeAssessment(rawClamped, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    makeDynamic("audience", 70),
    makeDynamic("scope", 80),
    makeDynamic("success", 75),
  ];

  it("caps to 3 on first assessment (no prior)", () => {
    const four = [...items, makeDynamic("extra", 60)];
    expect(normalizeDynamicCriteria(four, null)).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const duped = [makeDynamic("audience", 70), makeDynamic("audience", 90)];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70); // first wins
  });

  it("locks to prior criteria order when prior is set", () => {
    const prior = [
      { key: "scope", label: "Scope", bestPractice: "scope" },
      { key: "audience", label: "Audience", bestPractice: "audience" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[0].score).toBe(80);
    expect(result[1].key).toBe("audience");
    expect(result[1].score).toBe(70);
  });

  it("handles empty input gracefully", () => {
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("uses prior spec label/bestPractice even if model drifts", () => {
    const prior = [{ key: "audience", label: "Target Audience", bestPractice: "define_audience" }];
    const drifted = [{ ...makeDynamic("audience", 88), label: "User Segment", bestPractice: "other" }];
    const result = normalizeDynamicCriteria(drifted, prior);
    expect(result[0].label).toBe("Target Audience");
    expect(result[0].bestPractice).toBe("define_audience");
    expect(result[0].score).toBe(88);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
