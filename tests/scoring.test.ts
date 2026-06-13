import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

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
  it("passes values already in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(73.6)).toBe(74));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("abc" as unknown as number)).toBe(0));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the value for a single score", () => expect(computeOverall([72])).toBe(72));
  it("averages a set of scores", () => expect(computeOverall([50, 60, 70])).toBe(60));
  it("rounds the mean", () => expect(computeOverall([33, 34])).toBe(34));
});

describe("isReady", () => {
  it("false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });
  it("false when any dimension is below the floor", () => {
    expect(isReady(85, [85, DIMENSION_FLOOR - 1, 85], 80)).toBe(false);
  });
  it("true when overall meets threshold and all dimensions meet floor", () => {
    expect(isReady(80, [DIMENSION_FLOOR, 80, 90], 80)).toBe(true);
  });
  it("false for empty scores array", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  it("clamps raw scores", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [dyn("a", 75)],
      refinedPrompt: "Build something",
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: dim(80),
      conciseness: dim(80),
      dynamicCriteria: [dyn("a", 80)],
      refinedPrompt: "Build something",
    });
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when threshold is met and no dimension is below floor", () => {
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: dim(85),
        conciseness: dim(85),
        dynamicCriteria: [dyn("a", 85)],
        refinedPrompt: "Build something",
      },
      80,
    );
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("sets ready=false when a dimension is below the floor", () => {
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: dim(90),
        conciseness: dim(DIMENSION_FLOOR - 1),
        dynamicCriteria: [dyn("a", 90)],
        refinedPrompt: "Build something",
      },
      80,
    );
    expect(result.ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key", () => {
    const result = normalizeDynamicCriteria([dyn("a", 70), dyn("a", 80), dyn("b", 60)], null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first wins on dedup
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = ["a", "b", "c", "d"].map((k) => dyn(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria keys and order", () => {
    const prior = [
      { key: "x", label: "X", bestPractice: "x" },
      { key: "y", label: "Y", bestPractice: "y" },
    ];
    const fresh = [dyn("y", 85), dyn("x", 75)];
    const result = normalizeDynamicCriteria(fresh, prior);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(85);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
