import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const makeDyn = (key: string, score: number): DynamicCriterion => ({
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
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through 0 and 100", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages an even set", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds to nearest integer", () => expect(computeOverall([70, 71])).toBe(71));
  it("handles a single score", () => expect(computeOverall([85])).toBe(85));
});

describe("isReady", () => {
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80], 80)).toBe(false);
  });
  it("returns false when a dimension is below the floor", () => {
    expect(isReady(85, [85, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
  it("returns true when overall ≥ threshold and all dimensions ≥ floor", () => {
    expect(isReady(80, [DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true);
  });
  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
  it("uses exact threshold boundary (equal counts as ready)", () => {
    expect(isReady(80, [70, 70], 80)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  it("clamps out-of-range scores from the model", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: makeDim(150),
      conciseness: makeDim(-5),
      dynamicCriteria: [makeDyn("scope", 105)],
      refinedPrompt: "Build something",
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.dynamicCriteria[0].score).toBe(100);
  });

  it("computes overall as the mean of all dimensions", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: makeDim(70),
      conciseness: makeDim(80),
      dynamicCriteria: [makeDyn("k1", 90)],
      refinedPrompt: "p",
    });
    expect(result.overall).toBe(80);
  });

  it("marks ready=true when all conditions are met", () => {
    const result = finalizeAssessment(
      {
        projectType: "Web app",
        clarity: makeDim(85),
        conciseness: makeDim(85),
        dynamicCriteria: [makeDyn("k1", 85)],
        refinedPrompt: "p",
      },
      80,
    );
    expect(result.ready).toBe(true);
  });

  it("marks ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(
      {
        projectType: "Web app",
        clarity: makeDim(50),
        conciseness: makeDim(50),
        dynamicCriteria: [],
        refinedPrompt: "p",
      },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("stamps the active threshold on the returned assessment", () => {
    const result = finalizeAssessment(
      {
        projectType: "Web app",
        clarity: makeDim(70),
        conciseness: makeDim(70),
        dynamicCriteria: [],
        refinedPrompt: "p",
      },
      75,
    );
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const incoming: DynamicCriterion[] = [
    makeDyn("audience", 72),
    makeDyn("scope", 68),
    makeDyn("audience", 99), // duplicate — second copy should be dropped
  ];

  it("dedupes by key, keeping first occurrence", () => {
    const result = normalizeDynamicCriteria(incoming, null);
    expect(result.filter((d) => d.key === "audience")).toHaveLength(1);
    expect(result.find((d) => d.key === "audience")!.score).toBe(72);
  });

  it("caps new criteria to 3 items", () => {
    const many = [
      makeDyn("a", 70), makeDyn("b", 70), makeDyn("c", 70), makeDyn("d", 70),
    ];
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("locks to prior specs when provided, in order", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "scope" },
      { key: "audience", label: "Audience", bestPractice: "audience" },
    ];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[1].key).toBe("audience");
    // Labels come from prior spec, not incoming
    expect(result[0].label).toBe("Scope");
    expect(result[1].label).toBe("Audience");
  });

  it("handles undefined / empty input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
