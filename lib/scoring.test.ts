import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "./scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "./types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("floors at 0", () => expect(clamp(-5)).toBe(0));
  it("caps at 100", () => expect(clamp(150)).toBe(100));
  it("passes a value already in range", () => expect(clamp(50)).toBe(50));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("computes the mean", () => expect(computeOverall([80, 90])).toBe(85));
  it("rounds fractional means", () => expect(computeOverall([80, 81])).toBe(81));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("handles single value", () => expect(computeOverall([77])).toBe(77));
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= 65", () =>
    expect(isReady(82, [82, 80, 70], 80)).toBe(true));
  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [79, 80, 70], 80)).toBe(false));
  it("returns false when one dimension is below the floor (65)", () =>
    expect(isReady(82, [82, 90, 60], 80)).toBe(false));
  it("returns false for empty scores array", () =>
    expect(isReady(85, [], 80)).toBe(false));
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic scores in order", () => {
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 75, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "audience", label: "Audience", bestPractice: "", score: 70, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([80, 75, 70]);
  });
  it("clamps out-of-range values", () => {
    const result = dimensionScores({
      clarity: { score: 110, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

const makeDyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "",
  score,
  rationale: "",
  suggestion: "",
});

const makeSpec = (key: string): CriterionSpec => ({
  key,
  label: key,
  bestPractice: "",
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key on first assessment (no prior)", () => {
    const items = [makeDyn("a", 80), makeDyn("a", 70), makeDyn("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 items on first assessment", () => {
    const items = [makeDyn("a", 80), makeDyn("b", 70), makeDyn("c", 60), makeDyn("d", 50)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior criteria set on subsequent assessments", () => {
    const prior = [makeSpec("audience"), makeSpec("scope")];
    const items = [makeDyn("audience", 85), makeDyn("scope", 75), makeDyn("extra", 50)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["audience", "scope"]);
    expect(result[0].score).toBe(85);
  });

  it("returns empty array when items is undefined", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

const baseRaw = {
  projectType: "app",
  clarity: { score: 85, rationale: "", suggestion: "" },
  conciseness: { score: 75, rationale: "", suggestion: "" },
  dynamicCriteria: [makeDyn("audience", 80)],
  refinedPrompt: "Build an app",
};

describe("finalizeAssessment", () => {
  it("computes overall as the mean of all dimension scores", () => {
    const a = finalizeAssessment(baseRaw, 80);
    expect(a.overall).toBe(Math.round((85 + 75 + 80) / 3));
  });

  it("sets ready = true when conditions are met", () => {
    const a = finalizeAssessment(
      { ...baseRaw, clarity: { score: 90, rationale: "", suggestion: "" } },
      80,
    );
    expect(a.ready).toBe(true);
  });

  it("sets ready = false when one dimension is below floor", () => {
    const a = finalizeAssessment(
      { ...baseRaw, conciseness: { score: 60, rationale: "", suggestion: "" } },
      80,
    );
    expect(a.ready).toBe(false);
  });

  it("stamps the threshold onto the returned assessment", () => {
    const a = finalizeAssessment(baseRaw, 75);
    expect(a.threshold).toBe(75);
  });
});
