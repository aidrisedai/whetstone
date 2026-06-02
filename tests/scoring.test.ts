import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "../lib/scoring";
import type { CriterionSpec, DynamicCriterion } from "../lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes scores in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("floors negative values to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("caps values above 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds fractional scores", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
  });

  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("computes mean for a single score", () => {
    expect(computeOverall([80])).toBe(80);
  });

  it("rounds the mean", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([80, 81])).toBe(81); // 80.5 → 81
  });

  it("handles all-same scores", () => {
    expect(computeOverall([70, 70, 70])).toBe(70);
  });
});

// ── isReady ───────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns true when overall ≥ threshold and all scores ≥ floor", () => {
    expect(isReady(80, [80, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 70], 80)).toBe(false);
  });

  it("returns false when any score is below the dimension floor", () => {
    expect(isReady(85, [90, 64], 80)).toBe(false); // 64 < DIMENSION_FLOOR (65)
  });

  it("returns false for empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(isReady(70, [70, 70], 70)).toBe(true);
    expect(isReady(69, [70, 70], 70)).toBe(false);
  });
});

// ── DIMENSION_FLOOR sanity ─────────────────────────────────────────────────

it("DIMENSION_FLOOR is 65", () => {
  expect(DIMENSION_FLOOR).toBe(65);
});

it("DEFAULT_THRESHOLD is 80", () => {
  expect(DEFAULT_THRESHOLD).toBe(80);
});

// ── dimensionScores ───────────────────────────────────────────────────────

describe("dimensionScores", () => {
  const dyn: DynamicCriterion = {
    key: "k",
    label: "L",
    bestPractice: "bp",
    score: 72,
    rationale: "",
    suggestion: "",
  };

  it("returns [clarity, conciseness, ...dynamic] in order", () => {
    expect(
      dimensionScores({
        clarity: { score: 80, rationale: "", suggestion: "" },
        conciseness: { score: 75, rationale: "", suggestion: "" },
        dynamicCriteria: [dyn],
      }),
    ).toEqual([80, 75, 72]);
  });

  it("clamps every score", () => {
    expect(
      dimensionScores({
        clarity: { score: 999, rationale: "", suggestion: "" },
        conciseness: { score: -5, rationale: "", suggestion: "" },
        dynamicCriteria: [],
      }),
    ).toEqual([100, 0]);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: { score: 85, rationale: "r", suggestion: "s" },
    conciseness: { score: 75, rationale: "r", suggestion: "s" },
    dynamicCriteria: [] as DynamicCriterion[],
    refinedPrompt: "Build something",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(80); // (85 + 75) / 2
  });

  it("marks ready=true when overall ≥ threshold and all scores ≥ floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("marks ready=false when a dimension is below the floor", () => {
    const low = {
      ...base,
      conciseness: { score: 60, rationale: "r", suggestion: "s" },
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold onto the result", () => {
    expect(finalizeAssessment(base, 75).threshold).toBe(75);
  });

  it("clamps scores from the model", () => {
    const unclamped = {
      ...base,
      clarity: { score: 150, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(unclamped, 80);
    expect(result.clarity.score).toBe(100);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeDyn = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "r",
    suggestion: "s",
  });

  const makeSpec = (key: string): CriterionSpec => ({
    key,
    label: key,
    bestPractice: key,
  });

  it("deduplicates by key on first assessment", () => {
    const result = normalizeDynamicCriteria([makeDyn("a", 70), makeDyn("a", 80)], null);
    expect(result.filter((d) => d.key === "a")).toHaveLength(1);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 items on first assessment", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeDyn(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs on subsequent assessments", () => {
    const prior = [makeSpec("x"), makeSpec("y")];
    const incoming = [makeDyn("x", 82), makeDyn("y", 77), makeDyn("z", 50)];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result.map((d) => d.key)).toEqual(["x", "y"]);
    expect(result[0].score).toBe(82);
    expect(result[1].score).toBe(77);
  });

  it("preserves prior spec labels even when the model changes them", () => {
    const prior = [{ key: "a", label: "Original Label", bestPractice: "bp" }];
    const incoming = [{ ...makeDyn("a", 70), label: "New Label" }];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result[0].label).toBe("Original Label");
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
