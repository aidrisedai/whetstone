import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "./scoring";
import type { CriterionSpec, DynamicCriterion } from "./types";

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
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("clips below 0", () => expect(clamp(-5)).toBe(0));
  it("clips above 100", () => expect(clamp(150)).toBe(100));
  it("rounds to integer", () => expect(clamp(72.6)).toBe(73));
  it("passes through valid value", () => expect(clamp(80)).toBe(80));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([66, 67])).toBe(67));
  it("handles single score", () => expect(computeOverall([75])).toBe(75));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(80, [], 80)).toBe(false));
  it("returns false when overall below threshold", () => expect(isReady(79, [79, 79, 79], 80)).toBe(false));
  it("returns false when any dimension below floor (65)", () =>
    expect(isReady(80, [80, 64, 80], 80)).toBe(false));
  it("returns true when overall >= threshold and all above floor", () =>
    expect(isReady(80, [80, 65, 80], 80)).toBe(true));
  it("respects custom threshold", () =>
    expect(isReady(70, [70, 70, 70], 70)).toBe(true));
});

describe("DEFAULT_THRESHOLD and DIMENSION_FLOOR", () => {
  it("DEFAULT_THRESHOLD is 80", () => expect(DEFAULT_THRESHOLD).toBe(80));
  it("DIMENSION_FLOOR is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: dim(90),
    conciseness: dim(85),
    dynamicCriteria: [dyn("audience", 78), dyn("scope", 72)],
    refinedPrompt: "Build a tracker",
  };

  it("computes correct overall mean", () => {
    const a = finalizeAssessment(base, 80);
    // scores: 90, 85, 78, 72 → mean = 325/4 = 81.25 → rounds to 81
    expect(a.overall).toBe(81);
  });

  it("stamps threshold on the result", () => {
    const a = finalizeAssessment(base, 75);
    expect(a.threshold).toBe(75);
  });

  it("marks ready when crossing the gate", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.ready).toBe(true);
  });

  it("marks not ready when overall is below threshold", () => {
    const low = { ...base, clarity: dim(40), conciseness: dim(40), dynamicCriteria: [dyn("x", 40)] };
    const a = finalizeAssessment(low, 80);
    expect(a.ready).toBe(false);
  });

  it("clamps scores that are out of range", () => {
    const oob = { ...base, clarity: dim(150), conciseness: dim(-10) };
    const a = finalizeAssessment(oob, 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dyn("audience", 70),
    dyn("scope", 65),
    dyn("audience", 80), // duplicate — should be deduped, first wins
  ];

  it("dedupes by key (first occurrence wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    const keys = result.map((r) => r.key);
    expect(keys).toEqual(["audience", "scope"]);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first assessment", () => {
    const many: DynamicCriterion[] = [
      dyn("a", 60), dyn("b", 61), dyn("c", 62), dyn("d", 63),
    ];
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior criteria order and keys", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "scope" },
      { key: "audience", label: "Audience", bestPractice: "audience" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    // must respect prior order
    expect(result[0].key).toBe("scope");
    expect(result[1].key).toBe("audience");
    // must use prior label/bestPractice
    expect(result[0].label).toBe("Scope");
    // must use the matched score
    expect(result[0].score).toBe(65);
  });

  it("handles undefined items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
