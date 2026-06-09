import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

// ─── clamp ───────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes values within range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("floors at 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("caps at 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds decimals", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
    expect(clamp(99.9)).toBe(100);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number", () => {
    // @ts-expect-error intentional bad input
    expect(clamp("bad")).toBe(0);
    // @ts-expect-error intentional bad input
    expect(clamp(undefined)).toBe(0);
    // @ts-expect-error intentional bad input
    expect(clamp(null)).toBe(0);
  });
});

// ─── computeOverall ──────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the single value for a 1-element array", () => {
    expect(computeOverall([72])).toBe(72);
  });

  it("computes the mean of multiple scores", () => {
    expect(computeOverall([80, 70, 90])).toBe(80);
  });

  it("rounds the mean", () => {
    expect(computeOverall([33, 33, 34])).toBe(33); // 33.33… → 33
  });
});

// ─── isReady ─────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [70, 80, 90], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [70, 80, 90], 80)).toBe(false);
  });

  it("returns false when one score is below the floor (65)", () => {
    expect(isReady(80, [64, 80, 96], 80)).toBe(false);
  });

  it("returns true when all scores are exactly at the floor and overall meets threshold", () => {
    expect(isReady(80, [DIMENSION_FLOOR, 80, 95], 80)).toBe(true);
  });

  it("respects a custom threshold", () => {
    expect(isReady(90, [70, 90, 100], 95)).toBe(false);
    expect(isReady(95, [70, 95, 100], 95)).toBe(true);
  });
});

// ─── dimensionScores ─────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and all dynamic criteria scores", () => {
    const result = dimensionScores({
      clarity: { score: 75, rationale: "", suggestion: "" },
      conciseness: { score: 85, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "", score: 90, rationale: "", suggestion: "" },
        { key: "b", label: "B", bestPractice: "", score: 65, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([75, 85, 90, 65]);
  });

  it("clamps each score", () => {
    const result = dimensionScores({
      clarity: { score: -5, rationale: "", suggestion: "" },
      conciseness: { score: 110, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([0, 100]);
  });
});

// ─── normalizeDynamicCriteria ────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeD = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key.toUpperCase(),
    bestPractice: `best-${key}`,
    score,
    rationale: `rat-${key}`,
    suggestion: `sug-${key}`,
  });

  it("deduplicates by key (first occurrence wins)", () => {
    const items = [makeD("x", 80), makeD("x", 50), makeD("y", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(80); // first wins
    expect(result[1].key).toBe("y");
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = [makeD("a", 80), makeD("b", 70), makeD("c", 60), makeD("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("returns empty array for undefined/null input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("locks to prior spec order and updates scores/rationale", () => {
    const prior = [
      { key: "clarity", label: "Clarity", bestPractice: "bp-clarity" },
      { key: "scope", label: "Scope", bestPractice: "bp-scope" },
    ];
    const incoming = [makeD("scope", 77), makeD("clarity", 88)];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("clarity");
    expect(result[0].score).toBe(88);
    expect(result[0].label).toBe("Clarity"); // label from prior spec
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(77);
  });

  it("uses fallback score of 0 when a prior key is missing from incoming", () => {
    const prior = [{ key: "missing", label: "Missing", bestPractice: "bp" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].score).toBe(0);
  });
});

// ─── finalizeAssessment ──────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web App",
    clarity: { score: 80, rationale: "clear", suggestion: "" },
    conciseness: { score: 70, rationale: "ok", suggestion: "" },
    dynamicCriteria: [
      { key: "a", label: "A", bestPractice: "", score: 90, rationale: "", suggestion: "" },
    ],
    refinedPrompt: "Build X",
  };

  it("computes overall as the mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    // mean(80, 70, 90) = 80
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when threshold and floor are both met", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(
      { ...base, clarity: { ...base.clarity, score: 40 } },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const raw = {
      ...base,
      clarity: { score: 120, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    };
    const result = finalizeAssessment(raw, 80);
    // After clamping: clarity=100, conciseness=0, mean=50
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(50);
  });

  it("stamps the active threshold on the result", () => {
    const result = finalizeAssessment(base, 90);
    expect(result.threshold).toBe(90);
  });

  it("uses DEFAULT_THRESHOLD when none is provided", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});
