import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("rounds and clamps to [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds fractional means", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 → 71
  });
});

// ── dimensionScores ─────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores in order", () => {
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "L1", bestPractice: "", score: 90, rationale: "", suggestion: "" },
        { key: "k2", label: "L2", bestPractice: "", score: 60, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([80, 70, 90, 60]);
  });

  it("clamps each score", () => {
    const result = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

// ── isReady ─────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [90, 64, 80], 80)).toBe(false); // 64 < DIMENSION_FLOOR (65)
    expect(isReady(85, [90, 65, 80], 80)).toBe(true);  // 65 == DIMENSION_FLOOR, ok
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

// ── finalizeAssessment ──────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "game",
    refinedPrompt: "Build a game",
    clarity: { score: 80, rationale: "r", suggestion: "s" },
    conciseness: { score: 70, rationale: "r", suggestion: "s" },
    dynamicCriteria: [] as DynamicCriterion[],
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(75); // (80 + 70) / 2
  });

  it("sets ready=true when overall >= threshold and all scores >= floor", () => {
    // clarity=85, conciseness=85 → overall=85 >= threshold=80, both >= DIMENSION_FLOOR=65
    const raw = {
      ...baseRaw,
      clarity: { ...baseRaw.clarity, score: 85 },
      conciseness: { ...baseRaw.conciseness, score: 85 },
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(false); // overall=75 < 80
  });

  it("clamps out-of-range scores in the returned object", () => {
    const raw = {
      ...baseRaw,
      clarity: { score: 200, rationale: "", suggestion: "" },
      conciseness: { score: -50, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(baseRaw, 90);
    expect(result.threshold).toBe(90);
  });

  it("never trusts the model for ready — recomputes deterministically", () => {
    // Even if we injected a fake `ready` field, finalizeAssessment ignores it
    const raw = { ...baseRaw, clarity: { ...baseRaw.clarity, score: 90 }, conciseness: { ...baseRaw.conciseness, score: 90 } };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
    expect(result.overall).toBe(90);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeDC = (key: string, score = 70): DynamicCriterion => ({
    key,
    label: `Label ${key}`,
    bestPractice: `BP ${key}`,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates by key (first wins)", () => {
    const items = [makeDC("a", 80), makeDC("a", 90), makeDC("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first wins
  });

  it("caps to 3 items when no prior", () => {
    const items = [makeDC("a"), makeDC("b"), makeDC("c"), makeDC("d")];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior spec order when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp_b" },
      { key: "a", label: "A", bestPractice: "bp_a" },
    ];
    const items = [makeDC("a", 90), makeDC("b", 80)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("b");
    expect(result[0].score).toBe(80);
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(90);
    // label/bestPractice come from prior, not from items
    expect(result[0].label).toBe("B");
    expect(result[0].bestPractice).toBe("bp_b");
  });

  it("fills missing keys with positional fallback when prior has a key not in items", () => {
    const prior: CriterionSpec[] = [{ key: "missing", label: "M", bestPractice: "bp" }];
    const items = [makeDC("other", 50)];
    const result = normalizeDynamicCriteria(items, prior);
    // positional fallback: index 0 of deduped
    expect(result[0].key).toBe("missing");
    expect(result[0].score).toBe(50); // score from the positional match
  });

  it("returns empty array for undefined/null input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("filters out items without a string key", () => {
    const items = [{ key: 123 as unknown as string, label: "bad", bestPractice: "", score: 50, rationale: "", suggestion: "" }];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(0);
  });

  it("clamps scores in the locked-prior path", () => {
    const prior: CriterionSpec[] = [{ key: "a", label: "A", bestPractice: "bp" }];
    const items = [{ ...makeDC("a"), score: 999 }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].score).toBe(100);
  });
});

// ── DIMENSION_FLOOR constant ─────────────────────────────────────────────────

describe("DIMENSION_FLOOR", () => {
  it("equals 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
