import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, DynamicCriterion } from "@/lib/types";

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

const baseRaw = (): Omit<Assessment, "overall" | "ready" | "threshold"> => ({
  projectType: "Web app",
  clarity: makeDim(70),
  conciseness: makeDim(75),
  dynamicCriteria: [makeDynamic("define_audience", 80)],
  refinedPrompt: "Build a todo app.",
});

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(74.6)).toBe(75));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes valid values through", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores correctly", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds to nearest integer", () => expect(computeOverall([66, 67])).toBe(67));
  it("handles single element", () => expect(computeOverall([55])).toBe(55));
});

describe("dimensionScores", () => {
  it("returns clarity, conciseness, then dynamic scores", () => {
    const scores = dimensionScores({
      clarity: makeDim(70),
      conciseness: makeDim(80),
      dynamicCriteria: [makeDynamic("k1", 90), makeDynamic("k2", 60)],
    });
    expect(scores).toEqual([70, 80, 90, 60]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: makeDim(200),
      conciseness: makeDim(-10),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [80, 80, 80], 80)).toBe(false));

  it("returns false when any score is below the floor", () =>
    expect(isReady(80, [80, 80, 64], 80)).toBe(false));

  it("returns true when overall meets threshold and all scores clear the floor", () =>
    expect(isReady(80, [80, 80, 70], 80)).toBe(true));

  it("returns false for empty scores", () =>
    expect(isReady(80, [], 80)).toBe(false));

  it("uses custom threshold", () =>
    expect(isReady(75, [75, 80, 70], 75)).toBe(true));

  it("respects DIMENSION_FLOOR constant", () =>
    expect(DIMENSION_FLOOR).toBe(65));
});

describe("finalizeAssessment", () => {
  it("clamps scores and computes overall and ready flag", () => {
    const result = finalizeAssessment(baseRaw(), 80);
    expect(result.clarity.score).toBe(70);
    expect(result.conciseness.score).toBe(75);
    expect(result.overall).toBe(Math.round((70 + 75 + 80) / 3));
    expect(result.threshold).toBe(80);
    expect(result.ready).toBe(false); // overall ≈ 75, below 80
  });

  it("marks ready when all scores clear the threshold and floor", () => {
    const result = finalizeAssessment(
      {
        ...baseRaw(),
        clarity: makeDim(85),
        conciseness: makeDim(85),
        dynamicCriteria: [makeDynamic("k", 85)],
      },
      80,
    );
    expect(result.ready).toBe(true);
    expect(result.overall).toBe(85);
  });

  it("uses DEFAULT_THRESHOLD when none is provided", () => {
    const result = finalizeAssessment(baseRaw());
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(baseRaw(), 60);
    expect(result.threshold).toBe(60);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    makeDynamic("define_audience", 70),
    makeDynamic("success_criteria", 80),
    makeDynamic("define_audience", 90), // duplicate — should be deduped
  ];

  it("dedupes by key (first occurrence wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["define_audience", "success_criteria"]);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first call (no prior)", () => {
    const many = Array.from({ length: 5 }, (_, i) => makeDynamic(`k${i}`, 50));
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBe(3);
  });

  it("locks to the prior spec set when provided", () => {
    const prior = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.length).toBe(2);
    expect(result[0].key).toBe("define_audience");
    expect(result[0].label).toBe("Audience"); // locked from prior
    expect(result[0].score).toBe(70);
    expect(result[1].score).toBe(80);
  });

  it("handles undefined items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("filters out items with no key", () => {
    const bad = [{ key: undefined, score: 80, rationale: "", suggestion: "", label: "", bestPractice: "" }] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(bad, null);
    expect(result).toEqual([]);
  });
});
