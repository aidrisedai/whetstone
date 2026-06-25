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
import type { DynamicCriterion } from "../lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes through values in range", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps negative values to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(72.4)).toBe(72);
    expect(clamp(72.6)).toBe(73);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number", () => {
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });
});

// ── dimensionScores ────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "originality", label: "Originality", bestPractice: "", score: 90, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([80, 70, 90]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores above floor", () => {
    expect(isReady(80, [80, 75, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [90, 90, 90], 80)).toBe(false);
  });

  it("returns false when any score is below floor", () => {
    expect(isReady(85, [90, 64, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });

  it("passes exactly at the floor boundary", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true);
  });

  it("fails one below the floor boundary", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "web app",
    clarity: { score: 85, rationale: "clear", suggestion: "" },
    conciseness: { score: 75, rationale: "concise", suggestion: "" },
    dynamicCriteria: [
      { key: "originality", label: "Originality", bestPractice: "", score: 90, rationale: "", suggestion: "" },
    ],
    criteria: [] as import("../lib/types").CriterionSpec[],
    refinedPrompt: "",
  };

  it("computes overall as mean of clamped scores", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 90) / 3));
  });

  it("sets ready=true when threshold met and all dimensions clear floor", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when threshold not met", () => {
    const result = finalizeAssessment(
      { ...raw, clarity: { score: 50, rationale: "", suggestion: "" } },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment({
      ...raw,
      clarity: { score: 150, rationale: "", suggestion: "" },
    });
    expect(result.clarity.score).toBe(100);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const dc: DynamicCriterion[] = [
    { key: "originality", label: "Originality", bestPractice: "", score: 80, rationale: "", suggestion: "" },
    { key: "feasibility", label: "Feasibility", bestPractice: "", score: 70, rationale: "", suggestion: "" },
  ];

  it("deduplicates by key, keeping first occurrence", () => {
    const dupe = [...dc, { ...dc[0] }];
    const result = normalizeDynamicCriteria(dupe, null);
    expect(result.filter((d) => d.key === "originality")).toHaveLength(1);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const many: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `Label ${i}`,
      bestPractice: "",
      score: 70,
      rationale: "",
      suggestion: "",
    }));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria set on subsequent calls", () => {
    const prior = [
      { key: "originality", label: "Originality", bestPractice: "" },
      { key: "feasibility", label: "Feasibility", bestPractice: "" },
    ];
    const result = normalizeDynamicCriteria(dc, prior);
    expect(result.map((d) => d.key)).toEqual(["originality", "feasibility"]);
  });

  it("handles undefined input gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
