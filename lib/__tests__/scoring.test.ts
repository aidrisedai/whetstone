import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});
const spec = (key: string): CriterionSpec => ({ key, label: key, bestPractice: key });

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.6)).toBe(73));
  it("handles NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles non-number", () => expect(clamp("bad" as unknown as number)).toBe(0));
  it("passes through valid values", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("computes mean and rounds", () => expect(computeOverall([70, 80, 90])).toBe(80));
  it("handles single value", () => expect(computeOverall([75])).toBe(75));
  it("rounds correctly", () => expect(computeOverall([1, 2])).toBe(2));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns true when overall meets threshold and all dims clear floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });
  it("returns false when any dim is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [90, 90, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
  it("returns true when all dims exactly at floor and overall meets threshold", () => {
    expect(isReady(80, [DIMENSION_FLOOR, DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: dim(85),
    conciseness: dim(90),
    dynamicCriteria: [dynDim("a", 80)],
    refinedPrompt: "Build it.",
  };

  it("clamps scores in all dimensions", () => {
    const a = finalizeAssessment({
      ...raw,
      clarity: dim(150),
      conciseness: dim(-10),
    });
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(raw);
    expect(a.overall).toBe(Math.round((85 + 90 + 80) / 3));
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(raw, 75);
    expect(a.threshold).toBe(75);
  });

  it("marks ready when threshold and floor are met", () => {
    const highRaw = {
      ...raw,
      clarity: dim(85),
      conciseness: dim(85),
      dynamicCriteria: [dynDim("a", 85)],
    };
    const a = finalizeAssessment(highRaw, 80);
    expect(a.ready).toBe(true);
  });

  it("marks not ready when overall is below threshold", () => {
    const lowRaw = {
      ...raw,
      clarity: dim(50),
      conciseness: dim(50),
      dynamicCriteria: [dynDim("a", 50)],
    };
    const a = finalizeAssessment(lowRaw, 80);
    expect(a.ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("caps to 3 on first assessment (no prior)", () => {
    const items: DynamicCriterion[] = [
      dynDim("a", 80),
      dynDim("b", 70),
      dynDim("c", 65),
      dynDim("d", 60),
    ];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const items: DynamicCriterion[] = [dynDim("a", 80), dynDim("a", 70), dynDim("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
  });

  it("locks to prior criteria keys when prior is provided", () => {
    const prior: CriterionSpec[] = [spec("x"), spec("y")];
    const items: DynamicCriterion[] = [dynDim("x", 75), dynDim("y", 80), dynDim("z", 60)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["x", "y"]);
  });

  it("carries label and bestPractice from prior spec", () => {
    const prior: CriterionSpec[] = [{ key: "x", label: "Locked Label", bestPractice: "bp_x" }];
    const items: DynamicCriterion[] = [dynDim("x", 75)];
    const [r] = normalizeDynamicCriteria(items, prior);
    expect(r.label).toBe("Locked Label");
    expect(r.bestPractice).toBe("bp_x");
  });

  it("handles empty items gracefully", () => {
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("returns score 0 when prior key is not in model output", () => {
    const prior: CriterionSpec[] = [spec("missing")];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].score).toBe(0);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("is 80 when WHETSTONE_THRESHOLD is not set", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});
