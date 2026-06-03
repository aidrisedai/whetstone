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
import type { DynamicCriterion } from "@/lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("leaves in-range values alone", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(72.4)).toBe(72);
    expect(clamp(72.6)).toBe(73);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("handles NaN and non-numbers as 0", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns the mean of all scores rounded", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
    expect(computeOverall([33, 67])).toBe(50);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles a single score", () => {
    expect(computeOverall([77])).toBe(77);
  });

  it("rounds fractional means", () => {
    // (70 + 71) / 2 = 70.5 → 71
    expect(computeOverall([70, 71])).toBe(71);
    // (70 + 70 + 71) / 3 = 70.33… → 70
    expect(computeOverall([70, 70, 71])).toBe(70);
  });
});

// ── isReady ───────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(90, [70, 80, 90], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });

  it("returns false when any dimension is below the floor (65)", () => {
    expect(isReady(85, [85, 85, 64], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("requires ALL dimensions to clear the floor, not just overall", () => {
    // A very high clarity can't carry a single weak dimension
    expect(isReady(80, [100, 100, 64], 80)).toBe(false);
    expect(isReady(80, [100, 100, 65], 80)).toBe(true);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────

const dyn: DynamicCriterion = {
  key: "define_audience",
  label: "Audience",
  bestPractice: "define_audience",
  score: 72,
  rationale: "ok",
  suggestion: "be more specific",
};

describe("finalizeAssessment", () => {
  it("computes overall and ready flag deterministically", () => {
    const a = finalizeAssessment(
      {
        projectType: "App",
        clarity: { score: 80, rationale: "", suggestion: "" },
        conciseness: { score: 80, rationale: "", suggestion: "" },
        dynamicCriteria: [dyn],
        refinedPrompt: "Build something",
      },
      80,
    );
    // mean of [80, 80, 72] = 77.33 → 77
    expect(a.overall).toBe(77);
    expect(a.ready).toBe(false); // 77 < 80 threshold
    expect(a.threshold).toBe(80);
  });

  it("clamps out-of-range model scores", () => {
    const a = finalizeAssessment(
      {
        projectType: "Game",
        clarity: { score: 200, rationale: "", suggestion: "" },
        conciseness: { score: -5, rationale: "", suggestion: "" },
        dynamicCriteria: [],
        refinedPrompt: "Build a game",
      },
      80,
    );
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("marks ready when all conditions are met", () => {
    const a = finalizeAssessment(
      {
        projectType: "App",
        clarity: { score: 85, rationale: "", suggestion: "" },
        conciseness: { score: 82, rationale: "", suggestion: "" },
        dynamicCriteria: [{ ...dyn, score: 80 }],
        refinedPrompt: "Build something great",
      },
      80,
    );
    expect(a.ready).toBe(true);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const a = finalizeAssessment({
      projectType: "App",
      clarity: { score: 90, rationale: "", suggestion: "" },
      conciseness: { score: 90, rationale: "", suggestion: "" },
      dynamicCriteria: [],
      refinedPrompt: "Build it",
    });
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const raw: DynamicCriterion[] = [
    { key: "define_audience", label: "Audience", bestPractice: "define_audience", score: 60, rationale: "r1", suggestion: "s1" },
    { key: "success_criteria", label: "Success", bestPractice: "success_criteria", score: 75, rationale: "r2", suggestion: "s2" },
    { key: "set_constraints_and_scope", label: "Scope", bestPractice: "set_constraints_and_scope", score: 80, rationale: "r3", suggestion: "s3" },
    // duplicate key — should be dropped
    { key: "define_audience", label: "Audience Dup", bestPractice: "define_audience", score: 99, rationale: "dup", suggestion: "dup" },
  ];

  it("deduplicates by key on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(raw, null);
    expect(result).toHaveLength(3);
    const keys = result.map((r) => r.key);
    expect(new Set(keys).size).toBe(3);
    // first occurrence wins
    expect(result.find((r) => r.key === "define_audience")?.score).toBe(60);
  });

  it("caps to 3 items on first assessment", () => {
    const many: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: `bp${i}`,
      score: 70 + i,
      rationale: "",
      suggestion: "",
    }));
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("locks to prior specs in subsequent assessments", () => {
    const prior = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
    ];
    const incoming: DynamicCriterion[] = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience", score: 88, rationale: "new-r", suggestion: "new-s" },
      // success_criteria missing from model's new output
    ];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("define_audience");
    expect(result[0].score).toBe(88); // updated score
    expect(result[1].key).toBe("success_criteria"); // preserved
    expect(result[1].label).toBe("Success"); // label from prior, not model
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toHaveLength(0);
    expect(normalizeDynamicCriteria([], null)).toHaveLength(0);
  });
});

// ── floor constant ────────────────────────────────────────────────────────

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
