import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes through values already in 0-100", () => {
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
    expect(clamp(9999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-numbers", () => {
    // @ts-expect-error - testing runtime safety
    expect(clamp("hello")).toBe(0);
    expect(clamp(undefined as unknown as number)).toBe(0);
  });
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the value itself for a single-element array", () => {
    expect(computeOverall([80])).toBe(80);
  });

  it("computes the correct mean", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([50, 70, 90])).toBe(70);
  });

  it("rounds the mean", () => {
    expect(computeOverall([33, 34])).toBe(34); // 33.5 → rounds to 34
  });
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any score falls below DIMENSION_FLOOR", () => {
    const scores = [85, 90, DIMENSION_FLOOR - 1];
    expect(isReady(85, scores, 80)).toBe(false);
  });

  it("returns true when overall equals threshold exactly and all scores meet the floor exactly", () => {
    const floor = DIMENSION_FLOOR;
    expect(isReady(80, [80, floor, floor], 80)).toBe(true);
  });
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns [clarity, conciseness, ...dynamic] scores clamped", () => {
    const dynamic: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "a", score: 110, rationale: "", suggestion: "" },
    ];
    const result = dimensionScores({
      clarity: { score: 72, rationale: "", suggestion: "" },
      conciseness: { score: 68, rationale: "", suggestion: "" },
      dynamicCriteria: dynamic,
    });
    expect(result).toEqual([72, 68, 100]);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "Web app",
    clarity: { score: 75, rationale: "Good", suggestion: "Add user" },
    conciseness: { score: 70, rationale: "Tight", suggestion: "Trim" },
    dynamicCriteria: [
      { key: "k1", label: "L1", bestPractice: "bp1", score: 80, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "Build an app",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(Math.round((75 + 70 + 80) / 3));
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });

  it("sets ready=true when overall and floor conditions are met", () => {
    const high = {
      ...baseRaw,
      clarity: { ...baseRaw.clarity, score: 90 },
      conciseness: { ...baseRaw.conciseness, score: 90 },
      dynamicCriteria: [{ ...baseRaw.dynamicCriteria[0], score: 90 }],
    };
    const result = finalizeAssessment(high, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(baseRaw, 80);
    // overall = round((75+70+80)/3) = 75, below 80
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range model scores", () => {
    const wild = {
      ...baseRaw,
      clarity: { ...baseRaw.clarity, score: 150 },
    };
    const result = finalizeAssessment(wild, 80);
    expect(result.clarity.score).toBe(100);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeDynamic = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key.toUpperCase(),
    bestPractice: key,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates by key (keeps first occurrence)", () => {
    const items = [makeDynamic("a", 70), makeDynamic("a", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(clamp(70));
  });

  it("caps to 3 on first assessment (no prior criteria)", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeDynamic(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria on subsequent assessments", () => {
    const prior: CriterionSpec[] = [
      { key: "x", label: "X", bestPractice: "bp_x" },
      { key: "y", label: "Y", bestPractice: "bp_y" },
    ];
    const items = [makeDynamic("x", 85), makeDynamic("z", 60)];
    const result = normalizeDynamicCriteria(items, prior);

    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("x");
    expect(result[0].label).toBe("X");
    expect(result[0].bestPractice).toBe("bp_x");
    expect(result[0].score).toBe(85);

    // "y" is in prior but not in items → falls back to positional or score 0
    expect(result[1].key).toBe("y");
  });

  it("returns an empty array for undefined/null input without prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("handles malformed entries gracefully", () => {
    const items = [
      null as unknown as DynamicCriterion,
      { key: "a", label: "A", bestPractice: "a", score: 70, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
  });
});
