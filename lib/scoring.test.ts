import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

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
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(120)).toBe(100));
  it("rounds decimals", () => expect(clamp(73.6)).toBe(74));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through valid values", () => expect(clamp(55)).toBe(55));
});

describe("computeOverall", () => {
  it("averages scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds the result", () => expect(computeOverall([33, 34])).toBe(34));
});

describe("isReady", () => {
  it("passes when overall >= threshold and all scores >= floor", () =>
    expect(isReady(80, [80, 80, 80], 80)).toBe(true));
  it("fails when overall below threshold", () =>
    expect(isReady(79, [79, 79, 79], 80)).toBe(false));
  it("fails when one score below floor", () =>
    expect(isReady(85, [90, 90, 60], 80)).toBe(false));
  it("passes at exact floor", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR, 80], 80)).toBe(true));
  it("fails for empty scores", () =>
    expect(isReady(80, [], 80)).toBe(false));
});

describe("dimensionScores", () => {
  it("returns clamped clarity, conciseness, then dynamic scores", () => {
    const scores = dimensionScores({
      clarity: dim(75),
      conciseness: dim(80),
      dynamicCriteria: [dyn("a", 90), dyn("b", 50)],
    });
    expect(scores).toEqual([75, 80, 90, 50]);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Game",
    clarity: dim(70),
    conciseness: dim(60),
    dynamicCriteria: [dyn("mechanic", 75)],
    refinedPrompt: "Build a thing",
  };

  it("computes overall as mean of all scores", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(Math.round((70 + 60 + 75) / 3));
  });

  it("marks ready when threshold met and floor cleared", () => {
    const a = finalizeAssessment(
      { ...raw, clarity: dim(85), conciseness: dim(85), dynamicCriteria: [dyn("m", 85)] },
      80,
    );
    expect(a.ready).toBe(true);
  });

  it("marks not ready when below threshold", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range scores from model", () => {
    const a = finalizeAssessment(
      { ...raw, clarity: dim(110 as never), conciseness: dim(-5 as never) },
      80,
    );
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("stamps threshold on the result", () => {
    const a = finalizeAssessment(raw, 75);
    expect(a.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "mechanic", label: "Mechanic", bestPractice: "mechanic" },
    { key: "win", label: "Win state", bestPractice: "win" },
  ];

  it("deduplicates by key on first call (no prior)", () => {
    const items = [dyn("a", 70), dyn("a", 80), dyn("b", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 items on first call", () => {
    const items = [dyn("a", 70), dyn("b", 80), dyn("c", 90), dyn("d", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("pins to prior spec order with updated scores", () => {
    const items = [dyn("win", 88), dyn("mechanic", 92)];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].key).toBe("mechanic");
    expect(result[0].score).toBe(92);
    expect(result[1].key).toBe("win");
    expect(result[1].score).toBe(88);
  });

  it("falls back gracefully when model returns fewer than prior specs", () => {
    const result = normalizeDynamicCriteria([dyn("mechanic", 55)], specs);
    expect(result.length).toBe(2);
    expect(result[0].score).toBe(55);
    expect(result[1].score).toBe(0); // missing → 0
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
