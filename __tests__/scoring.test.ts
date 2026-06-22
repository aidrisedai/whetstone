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
} from "@/lib/scoring";
import type { Assessment, DynamicCriterion, CriterionSpec } from "@/lib/types";

const dim = (score: number) => ({
  score,
  rationale: "test",
  suggestion: "test",
});

const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "best",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps values to [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(74.6)).toBe(75);
    expect(clamp(74.4)).toBe(74);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages the scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0, 0, 0])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the mean", () => {
    expect(computeOverall([70, 71])).toBe(71);
  });
});

describe("dimensionScores", () => {
  it("returns clamped clarity + conciseness + dynamic scores", () => {
    const scores = dimensionScores({
      clarity: dim(90),
      conciseness: dim(80),
      dynamicCriteria: [dyn("a", 70), dyn("b", 150)],
    });
    expect(scores).toEqual([90, 80, 70, 100]);
  });
});

describe("isReady", () => {
  it("returns true when overall ≥ threshold and all scores ≥ floor", () => {
    expect(isReady(85, [80, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });

  it("returns false when any score is below the floor", () => {
    expect(isReady(85, [80, 64, 75], 80)).toBe(false);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const makeRaw = (clarityScore: number, conciseness: number, dynamic: number[]) => ({
    projectType: "App",
    clarity: dim(clarityScore),
    conciseness: dim(conciseness),
    dynamicCriteria: dynamic.map((s, i) => dyn(`d${i}`, s)),
    refinedPrompt: "a prompt",
  });

  it("computes overall as average of all dimension scores", () => {
    const a = finalizeAssessment(makeRaw(80, 80, [80]));
    expect(a.overall).toBe(80);
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(makeRaw(90, 90, [90]), 75);
    expect(a.threshold).toBe(75);
  });

  it("sets ready=true when all conditions met", () => {
    const a = finalizeAssessment(makeRaw(90, 90, [90]));
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall is too low", () => {
    const a = finalizeAssessment(makeRaw(70, 70, [70]));
    expect(a.ready).toBe(false);
  });

  it("sets ready=false when a dimension is below floor", () => {
    const a = finalizeAssessment(makeRaw(90, 90, [60]));
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const a = finalizeAssessment(makeRaw(120, -5, [200]));
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
    expect(a.dynamicCriteria[0].score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key", () => {
    const items = [dyn("x", 70), dyn("x", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(70); // first wins
  });

  it("caps to 3 items when no prior", () => {
    const items = [dyn("a", 70), dyn("b", 80), dyn("c", 90), dyn("d", 95)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior spec order when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp" },
      { key: "a", label: "A", bestPractice: "bp" },
    ];
    const items = [dyn("a", 70), dyn("b", 80)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("b");
    expect(result[1].key).toBe("a");
  });

  it("uses prior label and bestPractice when locking", () => {
    const prior: CriterionSpec[] = [{ key: "x", label: "Locked Label", bestPractice: "bp" }];
    const result = normalizeDynamicCriteria([dyn("x", 77)], prior);
    expect(result[0].label).toBe("Locked Label");
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toHaveLength(0);
  });

  it("exports DEFAULT_THRESHOLD and DIMENSION_FLOOR as numbers", () => {
    expect(typeof DEFAULT_THRESHOLD).toBe("number");
    expect(typeof DIMENSION_FLOOR).toBe("number");
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
