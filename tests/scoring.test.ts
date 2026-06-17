import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

const baseRaw = {
  projectType: "Web app",
  clarity: { score: 80, rationale: "r", suggestion: "s" },
  conciseness: { score: 75, rationale: "r", suggestion: "s" },
  dynamicCriteria: [makeDynamic("audience", 70)],
  refinedPrompt: "Build a thing.",
};

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds to integer", () => expect(clamp(73.7)).toBe(74));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes values in range unchanged", () => expect(clamp(55)).toBe(55));
});

describe("computeOverall", () => {
  it("averages three equal scores", () => expect(computeOverall([80, 80, 80])).toBe(80));
  it("rounds the mean", () => expect(computeOverall([80, 81])).toBe(81));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
});

describe("isReady", () => {
  it("passes when overall >= threshold and all dims >= floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });
  it("fails when overall < threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });
  it("fails when one dim is below floor", () => {
    expect(isReady(80, [80, 64, 80], 80)).toBe(false);
  });
  it("fails on empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
  it("respects custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 75)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("returns all dimension scores clamped", () => {
    const scores = dimensionScores({
      clarity: { score: 85, rationale: "", suggestion: "" },
      conciseness: { score: 200, rationale: "", suggestion: "" },
      dynamicCriteria: [makeDynamic("a", 70), makeDynamic("b", -5)],
    });
    expect(scores).toEqual([85, 100, 70, 0]);
  });
});

describe("finalizeAssessment", () => {
  it("stamps overall and threshold", () => {
    const a = finalizeAssessment(baseRaw, 80);
    expect(a.threshold).toBe(80);
    expect(a.overall).toBe(Math.round((80 + 75 + 70) / 3));
  });

  it("sets ready=true when all dims clear floor and overall >= threshold", () => {
    const raw = {
      ...baseRaw,
      clarity: { score: 85, rationale: "", suggestion: "" },
      conciseness: { score: 82, rationale: "", suggestion: "" },
      dynamicCriteria: [makeDynamic("a", 80)],
    };
    const a = finalizeAssessment(raw, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when a dim is below DIMENSION_FLOOR", () => {
    const raw = {
      ...baseRaw,
      clarity: { score: 90, rationale: "", suggestion: "" },
      conciseness: { score: 90, rationale: "", suggestion: "" },
      dynamicCriteria: [makeDynamic("a", DIMENSION_FLOOR - 1)],
    };
    const a = finalizeAssessment(raw, 80);
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const raw = {
      ...baseRaw,
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -20, rationale: "", suggestion: "" },
    };
    const a = finalizeAssessment(raw, 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "audience", label: "Audience", bestPractice: "define_audience" },
    { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
  ];

  it("dedupes by key when no prior", () => {
    const items = [makeDynamic("a", 70), makeDynamic("a", 80), makeDynamic("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first wins
  });

  it("caps to 3 on first assessment", () => {
    const items = [1, 2, 3, 4].map((i) => makeDynamic(`k${i}`, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs when provided", () => {
    const items = [makeDynamic("audience", 82), makeDynamic("scope", 75)];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[0].label).toBe("Audience");
    expect(result[0].score).toBe(82);
  });

  it("uses fallback score 0 when prior key missing from model response", () => {
    const result = normalizeDynamicCriteria([], specs);
    expect(result[0].score).toBe(0);
  });

  it("handles undefined items gracefully", () => {
    expect(() => normalizeDynamicCriteria(undefined, null)).not.toThrow();
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
