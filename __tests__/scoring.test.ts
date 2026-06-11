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

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("clamps below 0 to 0", () => expect(clamp(-1)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(101)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.6)).toBe(73));
  it("passes through 0 and 100", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
  it("handles non-number types", () => expect(clamp("oops" as unknown as number)).toBe(0));
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages three equal scores", () => expect(computeOverall([60, 60, 60])).toBe(60));
  it("rounds the mean", () => expect(computeOverall([70, 71])).toBe(71));
  it("handles a single score", () => expect(computeOverall([83])).toBe(83));
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  const dynamic: DynamicCriterion[] = [
    { key: "feasibility", label: "Feasibility", score: 75, rationale: "", suggestion: "", bestPractice: "" },
    { key: "originality", label: "Originality", score: 200, rationale: "", suggestion: "", bestPractice: "" },
  ];

  it("includes clarity, conciseness, and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: dynamic,
    });
    expect(scores).toEqual([80, 70, 75, 100]); // 200 clamped to 100
  });

  it("clamps all values", () => {
    const scores = dimensionScores({
      clarity: { score: -5, rationale: "", suggestion: "" },
      conciseness: { score: 150, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([0, 100]);
  });
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("requires overall >= threshold", () => expect(isReady(79, [79, 79, 79], 80)).toBe(false));
  it("requires every dimension >= DIMENSION_FLOOR (65)", () => {
    expect(isReady(80, [80, 64, 80], 80)).toBe(false);
  });
  it("passes when overall >= threshold and all dimensions >= floor", () => {
    expect(isReady(80, [80, 65, 80], 80)).toBe(true);
  });
  it("passes when overall equals threshold and all dimensions equal the floor", () => {
    // overall=80 >= threshold=80, and min(65)=65 >= DIMENSION_FLOOR(65) → ready
    expect(isReady(80, [65, 65, 65, 65], 80)).toBe(true);
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base = {
    projectType: "web app",
    refinedPrompt: "Build a task manager",
    clarity: { score: 90, rationale: "clear", suggestion: "" },
    conciseness: { score: 85, rationale: "concise", suggestion: "" },
    dynamicCriteria: [
      { key: "feasibility", label: "Feasibility", score: 75, rationale: "", suggestion: "", bestPractice: "" },
    ],
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(base);
    expect(result.overall).toBe(Math.round((90 + 85 + 75) / 3));
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 70);
    expect(result.threshold).toBe(70);
  });

  it("sets ready=true when threshold is cleared and no floor violations", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(result.overall >= 80);
  });

  it("clamps out-of-range scores before computing", () => {
    const raw = {
      ...base,
      clarity: { score: 150, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeItem = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    score,
    rationale: "r",
    suggestion: "s",
    bestPractice: "bp",
  });

  it("dedupes by key, keeping first occurrence", () => {
    const items = [makeItem("a", 70), makeItem("a", 90), makeItem("b", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((i) => i.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 items on first assessment (no prior)", () => {
    const items = [makeItem("a", 70), makeItem("b", 75), makeItem("c", 80), makeItem("d", 85)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior keys when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "feasibility", label: "Feasibility", bestPractice: "" },
      { key: "originality", label: "Originality", bestPractice: "" },
    ];
    const items = [makeItem("feasibility", 72), makeItem("originality", 88), makeItem("extra", 55)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((i) => i.key)).toEqual(["feasibility", "originality"]);
    expect(result).toHaveLength(2);
  });

  it("handles undefined / empty input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("clamps scores when locked to a prior", () => {
    const prior: CriterionSpec[] = [{ key: "a", label: "A", bestPractice: "" }];
    const items = [makeItem("a", 999)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].score).toBe(100);
  });
});
