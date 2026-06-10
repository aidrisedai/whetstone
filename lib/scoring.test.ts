import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds decimals", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
  it("passes valid mid-range value through", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages two scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the result", () => expect(computeOverall([67, 68])).toBe(68)); // 67.5 → 68
  it("handles single value", () => expect(computeOverall([85])).toBe(85));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(80, [], 80)).toBe(false));
  it("returns true when overall meets threshold and all above floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });
  it("returns false when overall below threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });
  it("returns false when any score below floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR - 1, 80], 80)).toBe(false);
  });
  it("returns true when every score is exactly at floor and overall meets threshold", () => {
    expect(isReady(80, [DIMENSION_FLOOR, DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true);
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeCriterion = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates by key on first assessment", () => {
    const input = [makeCriterion("clarity", 70), makeCriterion("clarity", 80)];
    const result = normalizeDynamicCriteria(input, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("clarity");
  });

  it("caps to 3 on first assessment", () => {
    const input = ["a", "b", "c", "d"].map((k) => makeCriterion(k, 70));
    const result = normalizeDynamicCriteria(input, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria set on subsequent assessments", () => {
    const prior: CriterionSpec[] = [
      { key: "clarity", label: "Clarity", bestPractice: "be_clear_and_direct" },
      { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
    ];
    const incoming = [
      makeCriterion("clarity", 75),
      makeCriterion("scope", 60),
      makeCriterion("extra", 90),
    ];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("clarity");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("scope");
    expect(result[0].label).toBe("Clarity"); // label locked from prior
  });

  it("returns empty array for undefined input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toHaveLength(0);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "Web app",
    clarity: { score: 85, rationale: "clear", suggestion: "be clearer" },
    conciseness: { score: 75, rationale: "ok", suggestion: "cut more" },
    dynamicCriteria: [
      { key: "audience", label: "Audience", bestPractice: "define_audience", score: 80, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "Build a web app.",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(baseRaw, 80);
    // scores: 85, 75, 80 → mean = 240/3 = 80
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when overall meets threshold and all scores above floor", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall below threshold", () => {
    const raw = {
      ...baseRaw,
      clarity: { ...baseRaw.clarity, score: 50 },
      conciseness: { ...baseRaw.conciseness, score: 50 },
      dynamicCriteria: [{ ...baseRaw.dynamicCriteria[0], score: 50 }],
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const raw = {
      ...baseRaw,
      clarity: { ...baseRaw.clarity, score: 150 },
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
  });

  it("stamps the active threshold on the result", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });
});
