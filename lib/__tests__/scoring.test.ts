import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "../types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(105)).toBe(100));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("foo" as unknown as number)).toBe(0));
  it("handles exact 0", () => expect(clamp(0)).toBe(0));
  it("handles exact 100", () => expect(clamp(100)).toBe(100));
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns single value unchanged", () => expect(computeOverall([75])).toBe(75));
  it("averages correctly", () => expect(computeOverall([80, 60])).toBe(70));
  it("rounds fractional mean", () => expect(computeOverall([80, 61])).toBe(71)); // 141/2 = 70.5 → 71
  it("handles all 100s", () => expect(computeOverall([100, 100, 100])).toBe(100));
  it("handles all 0s", () => expect(computeOverall([0, 0, 0])).toBe(0));
});

// ── dimensionScores ────────────────────────────────────────────────────────

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
  it("includes clarity and conciseness first", () => {
    const scores = dimensionScores({ clarity: dim(80), conciseness: dim(70), dynamicCriteria: [] });
    expect(scores).toEqual([80, 70]);
  });

  it("appends dynamic criteria after fixed ones", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("audience", 60), dynDim("scope", 55)],
    });
    expect(scores).toEqual([80, 70, 60, 55]);
  });

  it("clamps scores that are out of range", () => {
    const scores = dimensionScores({
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns false when overall is below threshold", () => expect(isReady(79, [79, 79], 80)).toBe(false));
  it("returns false when a score is below the floor", () => expect(isReady(82, [82, 64], 80)).toBe(false)); // 64 < DIMENSION_FLOOR(65)
  it("returns true when all conditions met", () => expect(isReady(80, [80, 80, 80], 80)).toBe(true));
  it("exactly at floor passes", () => expect(isReady(80, [80, 65], 80)).toBe(true));
  it("one point below floor fails", () => expect(isReady(80, [80, 64], 80)).toBe(false));
  it("uses the provided threshold, not a hardcoded one", () => {
    expect(isReady(75, [75, 75], 75)).toBe(true);
    expect(isReady(75, [75, 75], 80)).toBe(false);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

const rawBase = {
  projectType: "Web app",
  clarity: dim(85),
  conciseness: dim(78),
  dynamicCriteria: [dynDim("audience", 82), dynDim("scope", 76)],
  refinedPrompt: "Build a thing.",
};

describe("finalizeAssessment", () => {
  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(rawBase, 80);
    expect(a.overall).toBe(Math.round((85 + 78 + 82 + 76) / 4));
  });

  it("sets ready=true when overall >= threshold and no score below floor", () => {
    const a = finalizeAssessment(rawBase, 80);
    expect(a.ready).toBe(a.overall >= 80 && Math.min(85, 78, 82, 76) >= DIMENSION_FLOOR);
  });

  it("sets ready=false when overall is below threshold", () => {
    const lowRaw = { ...rawBase, clarity: dim(50), conciseness: dim(50), dynamicCriteria: [dynDim("x", 50)] };
    const a = finalizeAssessment(lowRaw, 80);
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const a = finalizeAssessment({ ...rawBase, clarity: dim(200), conciseness: dim(-50) }, 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("stamps the threshold on the result", () => {
    expect(finalizeAssessment(rawBase, 75).threshold).toBe(75);
    expect(finalizeAssessment(rawBase, 90).threshold).toBe(90);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const a = finalizeAssessment(rawBase);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("preserves projectType and refinedPrompt unchanged", () => {
    const a = finalizeAssessment(rawBase, 80);
    expect(a.projectType).toBe("Web app");
    expect(a.refinedPrompt).toBe("Build a thing.");
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

const spec = (key: string): CriterionSpec => ({ key, label: key, bestPractice: key });

describe("normalizeDynamicCriteria", () => {
  it("returns empty array when input is empty and no prior", () => {
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("returns empty array when input is undefined and no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("deduplicates by key on first assessment (no prior)", () => {
    const items = [dynDim("audience", 70), dynDim("audience", 80), dynDim("scope", 65)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["audience", "scope"]);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 items on first assessment (no prior)", () => {
    const items = [
      dynDim("a", 70),
      dynDim("b", 71),
      dynDim("c", 72),
      dynDim("d", 73),
    ];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior order when prior criteria exist", () => {
    const prior = [spec("scope"), spec("audience")];
    const items = [dynDim("audience", 75), dynDim("scope", 68)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["scope", "audience"]);
    expect(result[0].score).toBe(68);
    expect(result[1].score).toBe(75);
  });

  it("uses prior label and bestPractice, not the model's echo", () => {
    const prior = [spec("audience")];
    const fromModel = [{ ...dynDim("audience", 70), label: "Different label", bestPractice: "different" }];
    const result = normalizeDynamicCriteria(fromModel, prior);
    expect(result[0].label).toBe("audience");
    expect(result[0].bestPractice).toBe("audience");
  });

  it("fills missing keys with empty strings when model omits a criterion", () => {
    const prior = [spec("audience"), spec("scope")];
    const items: DynamicCriterion[] = [dynDim("audience", 70)]; // scope missing
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(0);
  });

  it("filters out items without a string key", () => {
    const items = [
      { key: null as unknown as string, label: "x", bestPractice: "x", score: 50, rationale: "", suggestion: "" },
      dynDim("valid", 80),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["valid"]);
  });
});
