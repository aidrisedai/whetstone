import { describe, it, expect } from "vitest";
import {
  clamp,
  dimensionScores,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { Assessment, DynamicCriterion, CriterionSpec } from "../lib/types";

const dim = (score: number) => ({ score, rationale: "", suggestion: "" });
const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "",
  score,
  rationale: "",
  suggestion: "",
});

describe("clamp", () => {
  it("passes values in range", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100", () => expect(clamp(105)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(74.6)).toBe(75));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("abc" as never)).toBe(0));
});

describe("dimensionScores", () => {
  it("includes clarity and conciseness plus dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dyn("a", 90), dyn("b", 60)],
    });
    expect(scores).toEqual([80, 70, 90, 60]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-10),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages correctly", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("rounds to nearest integer", () => expect(computeOverall([80, 71])).toBe(76));
});

describe("isReady", () => {
  it("is true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(85, [80, 70, 90], 80)).toBe(true);
  });

  it("is false when overall is below threshold", () => {
    expect(isReady(75, [80, 70, 90], 80)).toBe(false);
  });

  it("is false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [80, 60, 90], 80)).toBe(false);
  });

  it("is false for empty scores array", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });

  it("floor boundary: exactly at DIMENSION_FLOOR passes", () => {
    expect(isReady(85, [DIMENSION_FLOOR, 80, 90], 80)).toBe(true);
  });

  it("floor boundary: one below DIMENSION_FLOOR fails", () => {
    expect(isReady(85, [DIMENSION_FLOOR - 1, 80, 90], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "web app",
    clarity: dim(90),
    conciseness: dim(70),
    dynamicCriteria: [dyn("originality", 80)],
    refinedPrompt: "Build a todo app",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((90 + 70 + 80) / 3));
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("marks ready when above threshold with all dims at floor", () => {
    const highBase: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...base,
      clarity: dim(90),
      conciseness: dim(85),
      dynamicCriteria: [dyn("a", 88)],
    };
    const result = finalizeAssessment(highBase, 80);
    expect(result.ready).toBe(true);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...base,
      clarity: dim(150),
      conciseness: dim(-20),
      dynamicCriteria: [],
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(50);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key (keeps first occurrence)", () => {
    const items = [dyn("a", 80), dyn("a", 70), dyn("b", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80);
  });

  it("caps at 3 when no prior is set", () => {
    const items = [dyn("a", 80), dyn("b", 70), dyn("c", 60), dyn("d", 50)];
    expect(normalizeDynamicCriteria(items, null).length).toBe(3);
  });

  it("locks to prior keys when prior exists", () => {
    const prior: CriterionSpec[] = [
      { key: "originality", label: "Originality", bestPractice: "unique" },
      { key: "scope", label: "Scope", bestPractice: "focused" },
    ];
    const items = [dyn("originality", 85), dyn("scope", 75), dyn("extra", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["originality", "scope"]);
    expect(result[0].score).toBe(85);
    expect(result[1].score).toBe(75);
  });

  it("handles undefined/empty input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
