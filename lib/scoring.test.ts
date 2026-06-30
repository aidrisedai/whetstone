import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "./scoring";
import type { DynamicCriterion } from "./types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("passes scores in range", () => expect(clamp(75)).toBe(75));
  it("rounds fractional scores", () => expect(clamp(74.6)).toBe(75));
  it("floors at 0", () => expect(clamp(-5)).toBe(0));
  it("caps at 100", () => expect(clamp(110)).toBe(100));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("abc" as never)).toBe(0));
});

describe("computeOverall", () => {
  it("returns mean of scores", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds the mean", () => expect(computeOverall([67, 68])).toBe(68));
});

describe("isReady", () => {
  it("is ready when overall >= threshold and all scores >= floor", () =>
    expect(isReady(80, [80, 70, 75], 80)).toBe(true));
  it("is not ready when overall is below threshold", () =>
    expect(isReady(79, [80, 80, 80], 80)).toBe(false));
  it("is not ready when one score is below the floor", () =>
    expect(isReady(85, [90, 90, 60], 80)).toBe(false));
  it("is not ready for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("is exactly ready at threshold", () => expect(isReady(80, [65, 80, 80], 80)).toBe(true));
  it("is not ready when a score is exactly below floor", () =>
    expect(isReady(80, [64, 80, 80], 80)).toBe(false));
});

describe("DEFAULT_THRESHOLD", () => {
  it("defaults to 80", () => expect(DEFAULT_THRESHOLD).toBe(80));
});

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic scores", () => {
    expect(
      dimensionScores({
        clarity: dim(80),
        conciseness: dim(70),
        dynamicCriteria: [dyn("a", 90), dyn("b", 60)],
      }),
    ).toEqual([80, 70, 90, 60]);
  });

  it("clamps each score", () => {
    expect(
      dimensionScores({
        clarity: dim(110),
        conciseness: dim(-5),
        dynamicCriteria: [],
      }),
    ).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "web",
    clarity: dim(80),
    conciseness: dim(70),
    dynamicCriteria: [dyn("audience", 75)],
    refinedPrompt: "A todo app",
  };

  it("computes overall correctly", () => {
    const result = finalizeAssessment(base);
    expect(result.overall).toBe(Math.round((80 + 70 + 75) / 3));
  });

  it("sets ready=true when threshold met and all dimensions above floor", () => {
    const result = finalizeAssessment({ ...base, clarity: dim(90), conciseness: dim(90), dynamicCriteria: [dyn("a", 90)] });
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall below threshold", () => {
    const result = finalizeAssessment({ ...base, clarity: dim(60), conciseness: dim(60), dynamicCriteria: [dyn("a", 60)] });
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps scores that are out of range", () => {
    const result = finalizeAssessment({ ...base, clarity: dim(120), conciseness: dim(-10) });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dyn("audience", 70),
    dyn("success", 80),
    dyn("scope", 65),
  ];

  it("dedupes by key on first call (no prior)", () => {
    const duped = [...items, dyn("audience", 90)];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result.map((r) => r.key)).toEqual(["audience", "success", "scope"]);
  });

  it("caps to 3 on first call", () => {
    const many = [dyn("a", 70), dyn("b", 80), dyn("c", 65), dyn("d", 90)];
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("locks to prior spec set", () => {
    const prior = [
      { key: "audience", label: "Audience", bestPractice: "bp1" },
      { key: "success", label: "Success", bestPractice: "bp2" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["audience", "success"]);
    expect(result[0].label).toBe("Audience");
    expect(result[0].score).toBe(70);
  });

  it("falls back to the same-index item when a prior key is missing from current items", () => {
    // When the prior key isn't in the current set, the code uses deduped[i] as a fallback
    // so the spec identity (key/label/bestPractice) is preserved but scores are borrowed
    // from the positionally-matching item.
    const prior = [{ key: "missing", label: "Missing", bestPractice: "bp" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("missing");
    expect(result[0].label).toBe("Missing");
    // Score comes from deduped[0] (the "audience" item) as the positional fallback
    expect(result[0].score).toBe(70);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
