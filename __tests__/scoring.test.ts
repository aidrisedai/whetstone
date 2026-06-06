import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("clamps negative numbers to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps numbers over 100 to 100", () => expect(clamp(120)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(73.6)).toBe(74));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-numbers", () => expect(clamp("hello" as unknown as number)).toBe(0));
  it("passes valid scores through", () => expect(clamp(80)).toBe(80));
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores correctly", () => expect(computeOverall([80, 60])).toBe(70));
  it("rounds the result", () => expect(computeOverall([80, 61])).toBe(71));
  it("handles a single score", () => expect(computeOverall([90])).toBe(90));
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false for empty scores array", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [80, 70, 72], 80)).toBe(false));
  it("returns false when a dimension is below the floor", () =>
    expect(isReady(85, [85, 60, 85], 80)).toBe(false));
  it("returns true when overall meets threshold and all dimensions meet floor", () =>
    expect(isReady(85, [85, 70, 80], 80)).toBe(true));
  it("returns true exactly at threshold with all at floor", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR, 80], 80)).toBe(true));
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

const baseDim = { score: 90, rationale: "r", suggestion: "s" };
const dynDim: DynamicCriterion = {
  key: "scope",
  label: "Scope",
  bestPractice: "narrow scope",
  score: 85,
  rationale: "r",
  suggestion: "s",
};

describe("finalizeAssessment", () => {
  it("computes overall as the mean of all dimensions", () => {
    const result = finalizeAssessment({
      projectType: "game",
      clarity: { ...baseDim, score: 80 },
      conciseness: { ...baseDim, score: 60 },
      dynamicCriteria: [{ ...dynDim, score: 70 }],
      refinedPrompt: "Build a game",
    });
    expect(result.overall).toBe(70); // (80 + 60 + 70) / 3 = 70
  });

  it("marks ready=true when all conditions met", () => {
    const result = finalizeAssessment({
      projectType: "game",
      clarity: { ...baseDim, score: 85 },
      conciseness: { ...baseDim, score: 82 },
      dynamicCriteria: [{ ...dynDim, score: 80 }],
      refinedPrompt: "Build a game",
    });
    expect(result.ready).toBe(true);
  });

  it("marks ready=false when any dimension is below floor", () => {
    const result = finalizeAssessment({
      projectType: "game",
      clarity: { ...baseDim, score: 90 },
      conciseness: { ...baseDim, score: 60 }, // below DIMENSION_FLOOR
      dynamicCriteria: [{ ...dynDim, score: 90 }],
      refinedPrompt: "Build a game",
    });
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment({
      projectType: "game",
      clarity: { ...baseDim, score: 150 },
      conciseness: { ...baseDim, score: -10 },
      dynamicCriteria: [],
      refinedPrompt: "Build a game",
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the active threshold onto the result", () => {
    const result = finalizeAssessment(
      {
        projectType: "game",
        clarity: baseDim,
        conciseness: baseDim,
        dynamicCriteria: [],
        refinedPrompt: "Build a game",
      },
      75,
    );
    expect(result.threshold).toBe(75);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

const makeDyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

const makeSpec = (key: string): CriterionSpec => ({ key, label: key, bestPractice: "bp" });

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key on first assessment", () => {
    const result = normalizeDynamicCriteria(
      [makeDyn("scope", 80), makeDyn("scope", 70)],
      null,
    );
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("scope");
    expect(result[0].score).toBe(80); // first occurrence wins
  });

  it("caps to 3 criteria on first assessment", () => {
    const items = [makeDyn("a", 80), makeDyn("b", 70), makeDyn("c", 60), makeDyn("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria keys when prior is set", () => {
    const prior = [makeSpec("scope"), makeSpec("feasibility")];
    const result = normalizeDynamicCriteria(
      [makeDyn("scope", 80), makeDyn("feasibility", 70), makeDyn("extra", 90)],
      prior,
    );
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key)).toEqual(["scope", "feasibility"]);
  });

  it("preserves prior labels when locking criteria", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope Control", bestPractice: "narrow" },
    ];
    const result = normalizeDynamicCriteria([makeDyn("scope", 80)], prior);
    expect(result[0].label).toBe("Scope Control");
  });

  it("returns empty array for undefined input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("uses score 0 when a prior key is not found in the new items", () => {
    const prior = [makeSpec("scope"), makeSpec("missing")];
    const result = normalizeDynamicCriteria([makeDyn("scope", 80)], prior);
    const missingEntry = result.find((r) => r.key === "missing");
    expect(missingEntry?.score).toBe(0);
  });
});

// ── constants ──────────────────────────────────────────────────────────────

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80", () => expect(DEFAULT_THRESHOLD).toBe(80));
  it("DIMENSION_FLOOR is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
