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
} from "../lib/scoring";
import type { Assessment, DynamicCriterion, CriterionSpec } from "../lib/types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("rounds and clamps to [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(50.7)).toBe(51);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns the mean, rounded", () => {
    expect(computeOverall([80, 70, 90])).toBe(80);
    expect(computeOverall([80, 70])).toBe(75);
    expect(computeOverall([33, 33, 33])).toBe(33);
  });

  it("returns 0 for empty input", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles single-element array", () => {
    expect(computeOverall([72])).toBe(72);
  });
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores", () => {
    const dynamic: DynamicCriterion[] = [
      { key: "k1", label: "L1", bestPractice: "", score: 70, rationale: "", suggestion: "" },
      { key: "k2", label: "L2", bestPractice: "", score: 85, rationale: "", suggestion: "" },
    ];
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 60, rationale: "", suggestion: "" },
      dynamicCriteria: dynamic,
    });
    expect(result).toEqual([80, 60, 70, 85]);
  });

  it("clamps out-of-range scores", () => {
    const result = dimensionScores({
      clarity: { score: 120, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    // One dimension at 64 (below DIMENSION_FLOOR=65) even if overall is fine
    expect(isReady(80, [80, 80, 64], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 71)).toBe(false);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base = {
    projectType: "web app",
    clarity: { score: 80, rationale: "r", suggestion: "s" },
    conciseness: { score: 70, rationale: "r", suggestion: "s" },
    dynamicCriteria: [
      { key: "k1", label: "L1", bestPractice: "", score: 90, rationale: "r", suggestion: "s" },
    ] as DynamicCriterion[],
    refinedPrompt: "Build something cool",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(base);
    expect(result.overall).toBe(80); // (80+70+90)/3 = 80
  });

  it("sets ready=true when threshold is met and floor cleared", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(base, 85);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing", () => {
    const raw = {
      ...base,
      clarity: { score: 200, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold used", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const spec: CriterionSpec[] = [
    { key: "ux", label: "UX", bestPractice: "bp1" },
    { key: "perf", label: "Performance", bestPractice: "bp2" },
  ];

  const items: DynamicCriterion[] = [
    { key: "ux", label: "UX", bestPractice: "bp1", score: 80, rationale: "r1", suggestion: "s1" },
    { key: "perf", label: "Performance", bestPractice: "bp2", score: 60, rationale: "r2", suggestion: "s2" },
  ];

  it("locks to prior spec order when prior is provided", () => {
    const result = normalizeDynamicCriteria(items, spec);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("ux");
    expect(result[1].key).toBe("perf");
    expect(result[0].score).toBe(80);
    expect(result[1].score).toBe(60);
  });

  it("deduplicates items with the same key", () => {
    const duped: DynamicCriterion[] = [
      ...items,
      { key: "ux", label: "UX", bestPractice: "bp1", score: 99, rationale: "dup", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result.filter((d) => d.key === "ux")).toHaveLength(1);
    expect(result.find((d) => d.key === "ux")?.score).toBe(80); // first wins
  });

  it("caps to 3 criteria when no prior is set", () => {
    const many: DynamicCriterion[] = ["a", "b", "c", "d"].map((k) => ({
      key: k,
      label: k,
      bestPractice: "",
      score: 50,
      rationale: "",
      suggestion: "",
    }));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("returns [] for undefined/null input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("fills missing keys with fallback from deduped list when prior is set", () => {
    // Model returns only 'ux', not 'perf' — prior locks to both
    const partial: DynamicCriterion[] = [
      { key: "ux", label: "UX", bestPractice: "bp1", score: 77, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(partial, spec);
    expect(result).toHaveLength(2);
    // Missing 'perf' falls back to deduped[1] which is undefined → score 0
    expect(result[1].key).toBe("perf");
    expect(result[1].score).toBe(0);
  });
});
