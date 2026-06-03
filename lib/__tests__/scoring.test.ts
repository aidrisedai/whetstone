import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("passes through valid values", () => expect(clamp(50)).toBe(50));
  it("handles NaN", () => expect(clamp(NaN)).toBe(0));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages correctly", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("rounds to nearest integer", () => expect(computeOverall([70, 71])).toBe(71));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns true when overall and all dims above floor", () =>
    expect(isReady(85, [80, 70, 75], 80)).toBe(true));
  it("returns false when overall below threshold", () =>
    expect(isReady(75, [80, 70, 75], 80)).toBe(false));
  it("returns false when any dim below floor", () =>
    expect(isReady(85, [80, 64, 90], 80)).toBe(false));
  it("passes exactly at threshold and floor", () =>
    expect(isReady(80, [65, 65, 65], 80)).toBe(true));
});

describe("dimensionScores", () => {
  it("returns clamped scores for fixed and dynamic dims", () => {
    const scores = dimensionScores({
      clarity: dim(105),
      conciseness: dim(-5),
      dynamicCriteria: [dyn("k1", 70)],
    });
    expect(scores).toEqual([100, 0, 70]);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key on first assessment", () => {
    const items: DynamicCriterion[] = [dyn("a", 50), dyn("a", 60), dyn("b", 70)];
    const out = normalizeDynamicCriteria(items, null);
    expect(out).toHaveLength(2);
    expect(out[0].key).toBe("a");
    expect(out[0].score).toBe(50); // first occurrence wins
  });

  it("caps to 3 on first assessment", () => {
    const items = [dyn("a", 50), dyn("b", 60), dyn("c", 70), dyn("d", 80)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior spec order when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "pb" },
      { key: "a", label: "A", bestPractice: "pa" },
    ];
    const items: DynamicCriterion[] = [dyn("a", 55), dyn("b", 75)];
    const out = normalizeDynamicCriteria(items, prior);
    expect(out).toHaveLength(2);
    expect(out[0].key).toBe("b");
    expect(out[0].score).toBe(75);
    expect(out[1].key).toBe("a");
    expect(out[1].score).toBe(55);
  });

  it("handles missing items in model output when locked to prior", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "A", bestPractice: "pa" },
      { key: "missing", label: "M", bestPractice: "pm" },
    ];
    const items: DynamicCriterion[] = [dyn("a", 60)];
    const out = normalizeDynamicCriteria(items, prior);
    expect(out).toHaveLength(2);
    expect(out[0].key).toBe("a");
    expect(out[0].score).toBe(60);
    // "missing" key not in output — falls back to deduped[1] which is undefined → score 0
    expect(out[1].key).toBe("missing");
    expect(out[1].score).toBe(0);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: dim(90),
    conciseness: dim(80),
    dynamicCriteria: [dyn("define_audience", 75), dyn("success_criteria", 70)],
    refinedPrompt: "Build something.",
  };

  // overall = round((90 + 80 + 75 + 70) / 4) = round(78.75) = 79
  it("computes overall as mean of all clamped scores", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.overall).toBe(79);
  });

  it("marks ready=true when overall >= threshold and all dims >= floor", () => {
    const high = { ...base, clarity: dim(90), conciseness: dim(85), dynamicCriteria: [dyn("a", 80), dyn("b", 80)] };
    const a = finalizeAssessment(high, 80);
    expect(a.overall).toBeGreaterThanOrEqual(80);
    expect(a.ready).toBe(true);
  });

  it("marks ready=false when overall below threshold", () => {
    const low = { ...base, clarity: dim(40), conciseness: dim(40), dynamicCriteria: [dyn("a", 40)] };
    const a = finalizeAssessment(low, 80);
    expect(a.ready).toBe(false);
  });

  it("stamps the threshold on the result", () => {
    const a = finalizeAssessment(base, 75);
    expect(a.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const a = finalizeAssessment(base);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps out-of-range model scores", () => {
    const wild = { ...base, clarity: dim(150), conciseness: dim(-10) };
    const a = finalizeAssessment(wild);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80", () => expect(DEFAULT_THRESHOLD).toBe(80));
  it("DIMENSION_FLOOR is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
