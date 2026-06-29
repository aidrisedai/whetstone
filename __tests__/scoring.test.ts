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
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes values in [0, 100] unchanged", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps values below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
    expect(clamp(99.9)).toBe(100);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-numbers", () => {
    expect(clamp("hello" as unknown as number)).toBe(0);
    expect(clamp(null as unknown as number)).toBe(0);
    expect(clamp(undefined as unknown as number)).toBe(0);
  });
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns the rounded mean of all scores", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
    expect(computeOverall([80, 90, 71])).toBe(80); // 241/3 = 80.33 → 80
    expect(computeOverall([0, 100])).toBe(50);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles a single score", () => {
    expect(computeOverall([75])).toBe(75);
  });
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(90, [70, 80, 90], 80)).toBe(true); // 70 >= 65
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR (65)", () => {
    expect(isReady(85, [85, 85, 64], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("uses exact threshold boundary (>= not >)", () => {
    expect(isReady(80, [65, 80, 80], 80)).toBe(true);
    expect(isReady(80, [65, 65, 65], 80)).toBe(true);
    expect(isReady(80, [64, 80, 80], 80)).toBe(false);
  });
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns clarity, conciseness, then dynamic scores in order", () => {
    const a = {
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "x", label: "X", bestPractice: "", score: 90, rationale: "", suggestion: "" },
      ],
    };
    expect(dimensionScores(a)).toEqual([80, 70, 90]);
  });

  it("clamps all scores", () => {
    const a = {
      clarity: { score: 120, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    };
    expect(dimensionScores(a)).toEqual([100, 0]);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "web app",
    clarity: { score: 85, rationale: "clear", suggestion: "good" },
    conciseness: { score: 75, rationale: "brief", suggestion: "good" },
    dynamicCriteria: [
      { key: "scope", label: "Scope", bestPractice: "bp", score: 90, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "Build a great app",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    // scores: 85, 75, 90 → mean = 250/3 = 83.33 → 83
    expect(result.overall).toBe(83);
  });

  it("sets ready=true when overall >= threshold and all scores >= 65", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none is provided", () => {
    const result = finalizeAssessment(baseRaw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps out-of-range model scores", () => {
    const raw = {
      ...baseRaw,
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("sets ready=false when a dimension is below the floor (65)", () => {
    const raw = {
      ...baseRaw,
      clarity: { score: 50, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeItem = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key.toUpperCase(),
    bestPractice: "bp",
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("caps to 3 on the first assessment (no prior)", () => {
    const items = [makeItem("a", 80), makeItem("b", 70), makeItem("c", 60), makeItem("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates items with the same key", () => {
    const items = [makeItem("a", 80), makeItem("a", 90), makeItem("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first occurrence wins
  });

  it("locks to prior criteria order and keys", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "bp1" },
      { key: "detail", label: "Detail", bestPractice: "bp2" },
    ];
    const items = [makeItem("detail", 88), makeItem("scope", 72)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("scope");
    expect(result[0].score).toBe(72);
    expect(result[1].key).toBe("detail");
    expect(result[1].score).toBe(88);
    // Labels come from prior spec
    expect(result[0].label).toBe("Scope");
    expect(result[1].label).toBe("Detail");
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("filters items with no key", () => {
    const items = [{ score: 80, rationale: "", suggestion: "" } as unknown as DynamicCriterion];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(0);
  });
});
