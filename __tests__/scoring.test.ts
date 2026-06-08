import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────
describe("clamp", () => {
  it("clamps values below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps values above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to the nearest integer", () => expect(clamp(74.6)).toBe(75));
  it("passes 0 through", () => expect(clamp(0)).toBe(0));
  it("passes 100 through", () => expect(clamp(100)).toBe(100));
  it("handles NaN → 0", () => expect(clamp(NaN)).toBe(0));
  it("handles non-number → 0", () => expect(clamp("abc" as unknown as number)).toBe(0));
});

// ── computeOverall ─────────────────────────────────────────────────────────
describe("computeOverall", () => {
  it("averages evenly", () => expect(computeOverall([80, 90])).toBe(85));
  it("rounds correctly", () => expect(computeOverall([80, 81])).toBe(81));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns single value unchanged", () => expect(computeOverall([77])).toBe(77));
  it("handles all zeros", () => expect(computeOverall([0, 0, 0])).toBe(0));
  it("handles all hundreds", () => expect(computeOverall([100, 100, 100])).toBe(100));
});

// ── dimensionScores ────────────────────────────────────────────────────────
describe("dimensionScores", () => {
  const dynamic: DynamicCriterion[] = [
    { key: "a", label: "A", bestPractice: "bp", score: 70, rationale: "", suggestion: "" },
    { key: "b", label: "B", bestPractice: "bp", score: 90, rationale: "", suggestion: "" },
  ];

  it("returns clarity + conciseness + dynamic scores", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 75, rationale: "", suggestion: "" },
      dynamicCriteria: dynamic,
    });
    expect(scores).toEqual([80, 75, 70, 90]);
  });

  it("clamps out-of-range values from the model", () => {
    const scores = dimensionScores({
      clarity: { score: 110, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── isReady ────────────────────────────────────────────────────────────────
describe("isReady", () => {
  it("returns true when overall ≥ threshold and all dims ≥ floor", () => {
    expect(isReady(85, [85, 90, 70], 80)).toBe(true);
  });
  it("returns false when overall < threshold", () => {
    expect(isReady(75, [75, 80, 70], 80)).toBe(false);
  });
  it("returns false when any dim < DIMENSION_FLOOR even if overall ≥ threshold", () => {
    // dim at 60 < DIMENSION_FLOOR (65) should fail even if overall is 85
    expect(isReady(85, [85, 100, 60], 80)).toBe(false);
  });
  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });
  it("returns true at exactly the threshold and floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────
describe("finalizeAssessment", () => {
  const base = {
    projectType: "game",
    clarity: { score: 80, rationale: "r", suggestion: "s" },
    conciseness: { score: 70, rationale: "r", suggestion: "s" },
    dynamicCriteria: [
      { key: "fun", label: "Fun", bestPractice: "bp", score: 90, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "build a game",
  };

  it("computes overall as mean of all dimension scores", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.overall).toBe(Math.round((80 + 70 + 90) / 3));
  });

  it("stamps the threshold onto the result", () => {
    expect(finalizeAssessment(base, 75).threshold).toBe(75);
  });

  it("sets ready=true when threshold is met and floor is cleared", () => {
    const a = finalizeAssessment(base, 70);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when threshold is not met", () => {
    const a = finalizeAssessment(base, 90);
    expect(a.ready).toBe(false);
  });

  it("clamps scores that are out of range (model errors)", () => {
    const a = finalizeAssessment(
      { ...base, clarity: { score: 150, rationale: "", suggestion: "" } },
      80,
    );
    expect(a.clarity.score).toBe(100);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────
describe("normalizeDynamicCriteria", () => {
  const fresh: DynamicCriterion[] = [
    { key: "fun", label: "Fun", bestPractice: "bp1", score: 80, rationale: "r", suggestion: "s" },
    { key: "clarity", label: "Clarity", bestPractice: "bp2", score: 70, rationale: "r", suggestion: "s" },
    { key: "scope", label: "Scope", bestPractice: "bp3", score: 60, rationale: "r", suggestion: "s" },
    { key: "extra", label: "Extra", bestPractice: "bp4", score: 90, rationale: "r", suggestion: "s" },
  ];

  it("caps to 3 on the first call (no prior)", () => {
    const result = normalizeDynamicCriteria(fresh, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const duped: DynamicCriterion[] = [...fresh.slice(0, 2), { ...fresh[0] }];
    const result = normalizeDynamicCriteria(duped, null);
    const keys = result.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("locks to prior keys when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "fun", label: "Fun", bestPractice: "bp1" },
      { key: "scope", label: "Scope", bestPractice: "bp3" },
    ];
    const result = normalizeDynamicCriteria(fresh, prior);
    expect(result.map((r) => r.key)).toEqual(["fun", "scope"]);
  });

  it("uses spec label/bestPractice even if model sends different ones", () => {
    const prior: CriterionSpec[] = [{ key: "fun", label: "OrigLabel", bestPractice: "origBP" }];
    const updated: DynamicCriterion[] = [
      { key: "fun", label: "ChangedLabel", bestPractice: "changedBP", score: 88, rationale: "r", suggestion: "s" },
    ];
    const result = normalizeDynamicCriteria(updated, prior);
    expect(result[0].label).toBe("OrigLabel");
    expect(result[0].bestPractice).toBe("origBP");
    expect(result[0].score).toBe(88);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters items without a string key", () => {
    const bad = [
      { key: 123 as unknown as string, label: "Bad", bestPractice: "x", score: 50, rationale: "", suggestion: "" },
      { key: "good", label: "Good", bestPractice: "x", score: 80, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(bad, null);
    expect(result.every((r) => typeof r.key === "string")).toBe(true);
    expect(result.some((r) => r.key === "good")).toBe(true);
  });
});
