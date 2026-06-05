import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, DynamicCriterion, CriterionSpec } from "@/lib/types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes through values in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds to integer", () => {
    expect(clamp(49.6)).toBe(50);
    expect(clamp(49.4)).toBe(49);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ────────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("computes mean and rounds", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([80, 81])).toBe(81); // Math.round(80.5) === 81
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("handles a single score", () => {
    expect(computeOverall([75])).toBe(75);
  });
});

// ── isReady ───────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });

  it("requires overall >= threshold", () => {
    expect(isReady(79, [79, 79], 80)).toBe(false);
    expect(isReady(80, [80, 80], 80)).toBe(true);
    expect(isReady(81, [81, 81], 80)).toBe(true);
  });

  it("requires every score >= DIMENSION_FLOOR (65)", () => {
    // overall is fine, but one dimension is below the floor
    expect(isReady(85, [85, 64], 80)).toBe(false);
    expect(isReady(85, [85, 65], 80)).toBe(true);
  });

  it("a strong score cannot carry a weak one", () => {
    // overall = 82, but one dim is 64 — should NOT export
    expect(isReady(82, [100, 64], 80)).toBe(false);
  });
});

// ── dimensionScores ───────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns clamped scores for clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 110, rationale: "", suggestion: "" }, // over 100 → clamped
      dynamicCriteria: [{ key: "x", label: "X", bestPractice: "", score: -5, rationale: "", suggestion: "" }],
    });
    expect(scores).toEqual([80, 100, 0]);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

const makeDynamic = (score: number): DynamicCriterion => ({
  key: "feasibility",
  label: "Feasibility",
  bestPractice: "Is it buildable?",
  score,
  rationale: "ok",
  suggestion: "",
});

const baseRaw = (): Omit<Assessment, "overall" | "ready" | "threshold"> => ({
  projectType: "app",
  clarity: { score: 85, rationale: "clear", suggestion: "" },
  conciseness: { score: 80, rationale: "concise", suggestion: "" },
  dynamicCriteria: [makeDynamic(75)],
  refinedPrompt: "build a todo app",
});

describe("finalizeAssessment", () => {
  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(baseRaw(), 80);
    // mean(85, 80, 75) = 80
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when overall meets threshold and all dims >= floor", () => {
    const result = finalizeAssessment(baseRaw(), 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const raw = baseRaw();
    raw.clarity.score = 60; // mean(60,80,75) = 71.67 → 72 < 80
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });

  it("sets ready=false when a dimension is below the floor (65)", () => {
    const raw = baseRaw();
    raw.clarity.score = 90;
    raw.conciseness.score = 90;
    raw.dynamicCriteria = [makeDynamic(64)]; // below floor
    // mean(90,90,64) = 81 >= 80 but 64 < 65
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(81);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const raw = baseRaw();
    raw.clarity.score = 200; // clamped to 100
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.overall).toBe(Math.round((100 + 80 + 75) / 3));
  });

  it("stamps the threshold onto the result", () => {
    const result = finalizeAssessment(baseRaw(), 70);
    expect(result.threshold).toBe(70);
  });

  it("uses DEFAULT_THRESHOLD when none supplied", () => {
    const result = finalizeAssessment(baseRaw());
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const dyn = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: "bp",
    score,
    rationale: "",
    suggestion: "",
  });

  it("deduplicates by key (first occurrence wins)", () => {
    const result = normalizeDynamicCriteria([dyn("a", 70), dyn("a", 80)], null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = ["a", "b", "c", "d"].map((k) => dyn(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria order and fills missing keys from positional fallback", () => {
    const prior: CriterionSpec[] = [
      { key: "feasibility", label: "Feasibility", bestPractice: "bp1" },
      { key: "impact", label: "Impact", bestPractice: "bp2" },
    ];
    const items = [dyn("impact", 80), dyn("feasibility", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("feasibility");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("impact");
    expect(result[1].score).toBe(80);
  });

  it("returns empty array when input is undefined", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("clamps scores in locked-criteria path", () => {
    const prior: CriterionSpec[] = [{ key: "a", label: "A", bestPractice: "bp" }];
    const result = normalizeDynamicCriteria([dyn("a", 150)], prior);
    expect(result[0].score).toBe(100);
  });

  it("preserves prior label and bestPractice even when model sends different values", () => {
    const prior: CriterionSpec[] = [{ key: "a", label: "Canonical Label", bestPractice: "canonical bp" }];
    const result = normalizeDynamicCriteria(
      [{ key: "a", label: "Wrong Label", bestPractice: "wrong", score: 70, rationale: "", suggestion: "" }],
      prior,
    );
    expect(result[0].label).toBe("Canonical Label");
    expect(result[0].bestPractice).toBe("canonical bp");
  });
});

// ── constants ─────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80 when env is unset", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
