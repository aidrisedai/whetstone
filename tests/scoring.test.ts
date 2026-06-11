import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { CriterionSpec, DynamicCriterion } from "../lib/types";

// --- clamp ---

describe("clamp", () => {
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds fractional scores", () => expect(clamp(72.6)).toBe(73));
  it("passes through valid scores", () => expect(clamp(50)).toBe(50));
  it("returns 0 for non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
});

// --- computeOverall ---

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("computes mean of scores", () => expect(computeOverall([80, 60])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([80, 61])).toBe(71));
  it("handles a single score", () => expect(computeOverall([77])).toBe(77));
});

// --- isReady ---

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns true when overall >= threshold and all scores >= floor", () =>
    expect(isReady(80, [80, 70], 80)).toBe(true));
  it("returns false when overall < threshold", () =>
    expect(isReady(79, [79, 70], 80)).toBe(false));
  it("returns false when any score < DIMENSION_FLOOR", () =>
    expect(isReady(85, [90, 64], 80)).toBe(false));
  it("returns true at exact threshold and floor", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true));
});

// --- dimensionScores ---

const dim = (score: number) => ({ score, rationale: "", suggestion: "" });
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "",
  suggestion: "",
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("audience", 60)],
    });
    expect(scores).toEqual([80, 70, 60]);
  });

  it("clamps every score in the output", () => {
    const scores = dimensionScores({
      clarity: dim(200),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// --- finalizeAssessment ---

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: dim(90),
    conciseness: dim(85),
    dynamicCriteria: [dynDim("audience", 82)],
    refinedPrompt: "Build a web app",
  };

  it("computes overall as mean of all dimension scores", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(Math.round((90 + 85 + 82) / 3));
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(raw, 75);
    expect(a.threshold).toBe(75);
  });

  it("marks ready when above threshold and floor", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.ready).toBe(true);
  });

  it("marks not ready when overall < threshold", () => {
    const lowRaw = { ...raw, clarity: dim(40), conciseness: dim(40), dynamicCriteria: [dynDim("a", 40)] };
    const a = finalizeAssessment(lowRaw, 80);
    expect(a.ready).toBe(false);
  });

  it("marks not ready when a dimension is below DIMENSION_FLOOR", () => {
    const edgeRaw = { ...raw, dynamicCriteria: [dynDim("audience", 60)] };
    const a = finalizeAssessment(edgeRaw, 80);
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const edgeRaw = { ...raw, clarity: dim(150), conciseness: dim(-10) };
    const a = finalizeAssessment(edgeRaw, 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when not provided", () => {
    const a = finalizeAssessment(raw);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// --- normalizeDynamicCriteria ---

const spec = (key: string): CriterionSpec => ({ key, label: key, bestPractice: key });

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key (keeps first)", () => {
    const items: DynamicCriterion[] = [
      dynDim("audience", 70),
      dynDim("audience", 80), // duplicate
      dynDim("scope", 65),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(2);
    expect(result[0].score).toBe(70); // first wins
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = ["a", "b", "c", "d"].map((k) => dynDim(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior criteria keys on subsequent assessments", () => {
    const prior = [spec("audience"), spec("scope")];
    const items: DynamicCriterion[] = [dynDim("scope", 88), dynDim("audience", 75), dynDim("extra", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["audience", "scope"]);
  });

  it("uses prior labels/bestPractice even when model echoes them", () => {
    const prior = [spec("audience")];
    const items: DynamicCriterion[] = [{ key: "audience", label: "WRONG", bestPractice: "WRONG", score: 70, rationale: "", suggestion: "" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("audience"); // from spec, not model
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("handles items with missing key gracefully", () => {
    const result = normalizeDynamicCriteria([{ score: 50 }] as unknown as DynamicCriterion[], null);
    expect(result).toEqual([]);
  });
});
