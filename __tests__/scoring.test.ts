import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------
describe("clamp", () => {
  it("clamps values below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
  });

  it("passes through valid integers unchanged", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number input", () => {
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeOverall
// ---------------------------------------------------------------------------
describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the single value for a one-element array", () => {
    expect(computeOverall([80])).toBe(80);
  });

  it("computes mean and rounds", () => {
    expect(computeOverall([70, 80])).toBe(75);
    expect(computeOverall([70, 71, 72])).toBe(71); // 213/3 = 71
  });

  it("rounds 0.5 up", () => {
    // 75 + 76 = 151 / 2 = 75.5 → 76
    expect(computeOverall([75, 76])).toBe(76);
  });
});

// ---------------------------------------------------------------------------
// isReady
// ---------------------------------------------------------------------------
describe("isReady", () => {
  it("returns false when scores is empty", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80], 80)).toBe(false);
  });

  it("returns false when any dimension is below the floor", () => {
    expect(isReady(85, [85, 64], 80)).toBe(false); // 64 < DIMENSION_FLOOR (65)
  });

  it("returns true when overall >= threshold and all dims >= floor", () => {
    expect(isReady(80, [80, 80], 80)).toBe(true);
    expect(isReady(100, [65, 100], 80)).toBe(true);
  });

  it("returns false when overall equals threshold but a dim is exactly at floor-1", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });

  it("returns true when every score is exactly at the floor and overall >= threshold", () => {
    const scores = [DIMENSION_FLOOR, DIMENSION_FLOOR, DIMENSION_FLOOR];
    const overall = computeOverall(scores); // 65
    expect(isReady(overall, scores, 65)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// dimensionScores
// ---------------------------------------------------------------------------
describe("dimensionScores", () => {
  it("produces [clarity, conciseness, ...dynamic] in order", () => {
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "", score: 90, rationale: "", suggestion: "" },
        { key: "b", label: "B", bestPractice: "", score: 60, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([80, 70, 90, 60]);
  });

  it("clamps each score", () => {
    const result = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

// ---------------------------------------------------------------------------
// finalizeAssessment
// ---------------------------------------------------------------------------
describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "web",
    refinedPrompt: "Build a todo app",
    clarity: { score: 85, rationale: "Clear", suggestion: "" },
    conciseness: { score: 75, rationale: "Concise", suggestion: "" },
    dynamicCriteria: [] as DynamicCriterion[],
  };

  it("clamps scores and computes overall", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.clarity.score).toBe(85);
    expect(result.conciseness.score).toBe(75);
    expect(result.overall).toBe(80); // (85+75)/2 = 80
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });

  it("sets ready=true when above threshold with all dims >= floor", () => {
    const result = finalizeAssessment(
      { ...baseRaw, clarity: { score: 90, rationale: "", suggestion: "" } },
      80,
    );
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when below threshold", () => {
    const raw = {
      ...baseRaw,
      clarity: { score: 50, rationale: "", suggestion: "" },
      conciseness: { score: 50, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing", () => {
    const raw = {
      ...baseRaw,
      clarity: { score: 200, rationale: "", suggestion: "" },
      conciseness: { score: -50, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(50);
  });

  it("uses DEFAULT_THRESHOLD when no threshold argument is passed", () => {
    const result = finalizeAssessment(baseRaw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ---------------------------------------------------------------------------
// normalizeDynamicCriteria
// ---------------------------------------------------------------------------
describe("normalizeDynamicCriteria", () => {
  const makeItem = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key.toUpperCase(),
    bestPractice: `best-${key}`,
    score,
    rationale: `rationale-${key}`,
    suggestion: `suggestion-${key}`,
  });

  it("returns empty array for undefined input and no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("deduplicates by key, keeping first occurrence", () => {
    const items = [makeItem("a", 80), makeItem("a", 90), makeItem("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first wins
  });

  it("caps to 3 items when no prior", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeItem(k, 70));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior spec order when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp-b" },
      { key: "a", label: "A", bestPractice: "bp-a" },
    ];
    const items = [makeItem("a", 85), makeItem("b", 72)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("b"); // prior order
    expect(result[0].score).toBe(72);
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(85);
  });

  it("uses prior label and bestPractice, not item's", () => {
    const prior: CriterionSpec[] = [{ key: "x", label: "PRIOR-X", bestPractice: "bp-prior" }];
    const items = [{ ...makeItem("x", 60), label: "ITEM-X", bestPractice: "bp-item" }];
    const [res] = normalizeDynamicCriteria(items, prior);
    expect(res.label).toBe("PRIOR-X");
    expect(res.bestPractice).toBe("bp-prior");
  });

  it("fills with 0/empty strings when prior key is missing from items", () => {
    const prior: CriterionSpec[] = [{ key: "missing", label: "M", bestPractice: "bp" }];
    const [res] = normalizeDynamicCriteria([], prior);
    expect(res.key).toBe("missing");
    expect(res.score).toBe(0);
    expect(res.rationale).toBe("");
  });

  it("clamps scores even when prior is set", () => {
    const prior: CriterionSpec[] = [{ key: "a", label: "A", bestPractice: "bp" }];
    const items = [{ ...makeItem("a", 150) }];
    const [res] = normalizeDynamicCriteria(items, prior);
    expect(res.score).toBe(100);
  });
});
