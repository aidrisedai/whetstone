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
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

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
  it("clamps to 0–100", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(50)).toBe(50);
  });
  it("rounds correctly", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });
  it("returns 0 for NaN or non-number", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([100, 0, 100])).toBe(67);
  });
  it("returns 0 for empty", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("requires overall >= threshold AND all >= DIMENSION_FLOOR", () => {
    expect(isReady(85, [80, 70, 90], 80)).toBe(true);
    expect(isReady(75, [80, 70, 90], 80)).toBe(false); // overall too low
    expect(isReady(85, [80, 60, 90], 80)).toBe(false); // one dimension below floor
  });
  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("collects fixed + dynamic scores", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dyn("a", 90), dyn("b", 60)],
    });
    expect(scores).toEqual([70, 80, 90, 60]);
  });
});

describe("finalizeAssessment", () => {
  it("computes overall and ready deterministically", () => {
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: dim(90),
        conciseness: dim(90),
        dynamicCriteria: [dyn("a", 90)],
        refinedPrompt: "Build something",
      },
      80,
    );
    expect(result.overall).toBe(90);
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("is not ready when overall is below threshold", () => {
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: dim(70),
        conciseness: dim(70),
        dynamicCriteria: [dyn("a", 70)],
        refinedPrompt: "Build something",
      },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("is not ready when a dimension is below the floor even if overall is high", () => {
    // clarity & dynamic are great, conciseness drags a dimension below floor
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: dim(100),
        conciseness: dim(50), // below DIMENSION_FLOOR (65)
        dynamicCriteria: [dyn("a", 100)],
        refinedPrompt: "Build something",
      },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: dim(150), // out of range
        conciseness: dim(-10), // out of range
        dynamicCriteria: [],
        refinedPrompt: "Build",
      },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none is supplied", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: dim(50),
      conciseness: dim(50),
      dynamicCriteria: [],
      refinedPrompt: "Build",
    });
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "a", label: "A", bestPractice: "bp_a" },
    { key: "b", label: "B", bestPractice: "bp_b" },
  ];

  it("dedupes by key on first assessment (no prior)", () => {
    const items = [dyn("a", 70), dyn("a", 80), dyn("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first wins in dedup
  });

  it("caps to 3 on first assessment", () => {
    const items = [dyn("a", 70), dyn("b", 60), dyn("c", 80), dyn("d", 90)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior keys when prior is provided", () => {
    const items = [dyn("a", 88), dyn("b", 77), dyn("c", 99)]; // c not in prior
    const result = normalizeDynamicCriteria(items, specs);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(88);
    expect(result[1].score).toBe(77);
    // Prior metadata is preserved
    expect(result[0].label).toBe("A");
    expect(result[0].bestPractice).toBe("bp_a");
  });

  it("handles undefined items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80 (the configured default)", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
