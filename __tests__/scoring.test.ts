import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes a mid-range value through", () => expect(clamp(50)).toBe(50));
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("handles NaN → 0", () => expect(clamp(NaN)).toBe(0));
  it("handles non-number → 0", () => expect(clamp("abc" as unknown as number)).toBe(0));
  it("handles 0 exactly", () => expect(clamp(0)).toBe(0));
  it("handles 100 exactly", () => expect(clamp(100)).toBe(100));
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => expect(computeOverall([])).toBe(0));
  it("averages correctly", () => expect(computeOverall([80, 90])).toBe(85));
  it("rounds the average", () => expect(computeOverall([80, 81])).toBe(81));
  it("handles a single score", () => expect(computeOverall([73])).toBe(73));
  it("handles all zeros", () => expect(computeOverall([0, 0, 0])).toBe(0));
  it("handles all 100s", () => expect(computeOverall([100, 100, 100])).toBe(100));
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const T = 80;

  it("returns true when overall meets threshold and all above floor", () =>
    expect(isReady(80, [80, 70, 75], T)).toBe(true));

  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [80, 70, 75], T)).toBe(false));

  it("returns false when any score is below DIMENSION_FLOOR", () =>
    expect(isReady(85, [85, 64, 90], T)).toBe(false));

  it("returns false for empty scores", () =>
    expect(isReady(90, [], T)).toBe(false));

  it("floor boundary: DIMENSION_FLOOR exactly passes", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR, 80], T)).toBe(true));

  it("floor boundary: one below DIMENSION_FLOOR fails", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR - 1, 80], T)).toBe(false));
});

// ── dimensionScores ────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  const dyn: DynamicCriterion[] = [
    { key: "a", label: "A", bestPractice: "bp", score: 77, rationale: "", suggestion: "" },
    { key: "b", label: "B", bestPractice: "bp", score: 88, rationale: "", suggestion: "" },
  ];

  it("returns clarity + conciseness + dynamic scores in order", () => {
    const result = dimensionScores({
      clarity: { score: 75, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: dyn,
    });
    expect(result).toEqual([75, 80, 77, 88]);
  });

  it("clamps each dimension score", () => {
    const result = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "game",
    refinedPrompt: "Build a game",
    clarity: { score: 85, rationale: "clear", suggestion: "none" },
    conciseness: { score: 82, rationale: "concise", suggestion: "none" },
    dynamicCriteria: [
      { key: "scope", label: "Scope", bestPractice: "bp", score: 80, rationale: "", suggestion: "" },
    ],
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(Math.round((85 + 82 + 80) / 3));
  });

  it("sets ready=true when overall >= threshold and all above floor", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("stamps the threshold onto the result", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low = {
      ...baseRaw,
      clarity: { score: 50, rationale: "", suggestion: "" },
      conciseness: { score: 55, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k", label: "K", bestPractice: "bp", score: 55, rationale: "", suggestion: "" },
      ],
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps an out-of-range raw score", () => {
    const wild = { ...baseRaw, clarity: { score: 999, rationale: "", suggestion: "" } };
    const result = finalizeAssessment(wild, 80);
    expect(result.clarity.score).toBe(100);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeCrit = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: "bp",
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("caps to 3 criteria when there is no prior", () => {
    const items = [makeCrit("a", 70), makeCrit("b", 80), makeCrit("c", 90), makeCrit("d", 60)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("deduplicates by key (first occurrence wins)", () => {
    const items = [makeCrit("a", 70), makeCrit("a", 99), makeCrit("b", 80)];
    const result = normalizeDynamicCriteria(items, null);
    const aEntry = result.find((r) => r.key === "a")!;
    expect(aEntry.score).toBe(70);
  });

  it("locks to prior set when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "bp" },
      { key: "fun", label: "Fun", bestPractice: "bp" },
    ];
    const items = [makeCrit("scope", 85), makeCrit("fun", 90), makeCrit("extra", 50)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["scope", "fun"]);
    expect(result[0].score).toBe(85);
    expect(result[1].score).toBe(90);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("filters out items with non-string keys", () => {
    const items = [
      { key: null, label: "Bad", bestPractice: "bp", score: 70, rationale: "", suggestion: "" },
      makeCrit("good", 80),
    ] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("good");
  });
});
