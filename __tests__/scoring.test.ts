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
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("rounds and pins at 0..100", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
  });
  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns the rounded mean", () => {
    expect(computeOverall([60, 70, 80])).toBe(70);
    expect(computeOverall([50, 51])).toBe(51); // rounds 50.5 → 51
  });
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("handles a single score", () => {
    expect(computeOverall([75])).toBe(75);
  });
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("true when overall >= threshold and every score >= DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 70, 65], 80)).toBe(true);
  });
  it("false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });
  it("false when any dimension is below the floor", () => {
    expect(isReady(90, [90, 64, 90], 80)).toBe(false);
  });
  it("false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

// ── dimensionScores ────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("includes clarity, conciseness, then dynamic scores in order", () => {
    const scores = dimensionScores({
      clarity: { score: 82, rationale: "", suggestion: "" },
      conciseness: { score: 76.4, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "a", score: 65, rationale: "", suggestion: "" },
        { key: "b", label: "B", bestPractice: "b", score: 91, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([82, 76, 65, 91]);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

const baseDim = { rationale: "r", suggestion: "s" };
const rawBase = {
  projectType: "Game",
  clarity: { score: 85, ...baseDim },
  conciseness: { score: 82, ...baseDim },
  dynamicCriteria: [
    { key: "x", label: "X", bestPractice: "p", score: 78, ...baseDim },
  ],
  refinedPrompt: "Build a game.",
};

describe("finalizeAssessment", () => {
  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(rawBase, 80);
    expect(a.overall).toBe(Math.round((85 + 82 + 78) / 3));
  });
  it("marks ready when overall and all floors pass", () => {
    const a = finalizeAssessment(rawBase, 80);
    expect(a.ready).toBe(true);
    expect(a.threshold).toBe(80);
  });
  it("marks not-ready when a dimension is below the floor", () => {
    const raw = {
      ...rawBase,
      dynamicCriteria: [
        { key: "x", label: "X", bestPractice: "p", score: 64, ...baseDim },
      ],
    };
    const a = finalizeAssessment(raw, 80);
    expect(a.ready).toBe(false);
  });
  it("clamps out-of-range scores", () => {
    const raw = {
      ...rawBase,
      clarity: { score: 150, ...baseDim },
      conciseness: { score: -10, ...baseDim },
    };
    const a = finalizeAssessment(raw);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });
  it("uses DEFAULT_THRESHOLD when none supplied", () => {
    const a = finalizeAssessment(rawBase);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key on first assessment", () => {
    const result = normalizeDynamicCriteria(
      [dyn("a", 70), dyn("a", 80), dyn("b", 60)],
      null,
    );
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first occurrence wins
  });
  it("caps to 3 on first assessment", () => {
    const items = ["a", "b", "c", "d"].map((k) => dyn(k, 70));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });
  it("locks to prior criteria order on subsequent assessments", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "b" },
      { key: "a", label: "A", bestPractice: "a" },
    ];
    const items = [dyn("a", 88), dyn("b", 72)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(72);
    expect(result[1].score).toBe(88);
  });
  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
  it("uses prior label/bestPractice even if model echoes different values", () => {
    const prior = [{ key: "x", label: "OrigLabel", bestPractice: "orig_bp" }];
    const items = [{ ...dyn("x", 75), label: "AltLabel", bestPractice: "alt_bp" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("OrigLabel");
    expect(result[0].bestPractice).toBe("orig_bp");
  });
});

// ── exported constants ─────────────────────────────────────────────────────

describe("constants", () => {
  it("DEFAULT_THRESHOLD is between 1 and 100", () => {
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(100);
  });
  it("DIMENSION_FLOOR is below DEFAULT_THRESHOLD", () => {
    expect(DIMENSION_FLOOR).toBeLessThan(DEFAULT_THRESHOLD);
  });
});
