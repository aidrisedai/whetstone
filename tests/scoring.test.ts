import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

// ── clamp ─────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes values already in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ────────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the value for a single score", () => {
    expect(computeOverall([80])).toBe(80);
  });

  it("computes the mean of multiple scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([50, 75, 100])).toBe(75);
  });

  it("rounds the result", () => {
    expect(computeOverall([0, 1])).toBe(1); // 0.5 rounds up
  });
});

// ── isReady ───────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("is false for an empty scores array", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });

  it("is true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 80, 80], threshold)).toBe(true);
    expect(isReady(95, [70, 80, 90], threshold)).toBe(true);
  });

  it("is false when overall < threshold even if all scores clear the floor", () => {
    expect(isReady(79, [79, 79, 79], threshold)).toBe(false);
  });

  it("is false when a dimension is below the floor even if overall is high", () => {
    // DIMENSION_FLOOR is 65
    expect(isReady(90, [64, 90, 100], threshold)).toBe(false);
    expect(isReady(90, [65, 90, 100], threshold)).toBe(true);
  });
});

// ── dimensionScores ───────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic scores in order", () => {
    const a = {
      clarity: { score: 70, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "A", bestPractice: "", score: 90, rationale: "", suggestion: "" },
        { key: "k2", label: "B", bestPractice: "", score: 60, rationale: "", suggestion: "" },
      ] as DynamicCriterion[],
    };
    expect(dimensionScores(a)).toEqual([70, 80, 90, 60]);
  });

  it("clamps scores that come in out of range", () => {
    const a = {
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    };
    expect(dimensionScores(a)).toEqual([100, 0]);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const criteria: DynamicCriterion[] = [
    { key: "feasibility", label: "Feasibility", bestPractice: "bp1", score: 72, rationale: "r1", suggestion: "s1" },
    { key: "novelty", label: "Novelty", bestPractice: "bp2", score: 55, rationale: "r2", suggestion: "s2" },
    { key: "scope", label: "Scope", bestPractice: "bp3", score: 88, rationale: "r3", suggestion: "s3" },
  ];

  it("deduplicates by key and caps to 3 on first call (no prior)", () => {
    const result = normalizeDynamicCriteria(criteria, null);
    expect(result).toHaveLength(3);
    const keys = result.map((c) => c.key);
    expect(new Set(keys).size).toBe(3);
  });

  it("strips duplicates — first occurrence wins", () => {
    const duped: DynamicCriterion[] = [
      ...criteria,
      { key: "feasibility", label: "Dup", bestPractice: "dup", score: 99, rationale: "dup", suggestion: "dup" },
    ];
    const result = normalizeDynamicCriteria(duped, null);
    const feas = result.find((c) => c.key === "feasibility")!;
    expect(feas.score).toBe(72); // first occurrence preserved
  });

  it("locks to prior keys when prior is set, in prior order", () => {
    const prior = [
      { key: "novelty", label: "Novelty", bestPractice: "bp2" },
      { key: "feasibility", label: "Feasibility", bestPractice: "bp1" },
    ];
    const result = normalizeDynamicCriteria(criteria, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("novelty");
    expect(result[1].key).toBe("feasibility");
  });

  it("uses prior label and bestPractice, not the model's", () => {
    const prior = [{ key: "feasibility", label: "OrigLabel", bestPractice: "OrigBP" }];
    const result = normalizeDynamicCriteria(criteria, prior);
    expect(result[0].label).toBe("OrigLabel");
    expect(result[0].bestPractice).toBe("OrigBP");
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(null as unknown as DynamicCriterion[], null)).toEqual([]);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  it("computes overall as the mean of all dimension scores", () => {
    const a = finalizeAssessment({
      projectType: "App",
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k", label: "K", bestPractice: "", score: 80, rationale: "", suggestion: "" },
      ],
      refinedPrompt: "test",
    });
    expect(a.overall).toBe(80);
  });

  it("marks ready=true when overall >= threshold and all dims >= floor", () => {
    const a = finalizeAssessment(
      {
        projectType: "App",
        clarity: { score: 85, rationale: "", suggestion: "" },
        conciseness: { score: 80, rationale: "", suggestion: "" },
        dynamicCriteria: [
          { key: "k", label: "K", bestPractice: "", score: 75, rationale: "", suggestion: "" },
        ],
        refinedPrompt: "test",
      },
      80,
    );
    expect(a.ready).toBe(true);
    expect(a.threshold).toBe(80);
  });

  it("marks ready=false when a dim is below DIMENSION_FLOOR", () => {
    const a = finalizeAssessment(
      {
        projectType: "App",
        clarity: { score: 90, rationale: "", suggestion: "" },
        conciseness: { score: DIMENSION_FLOOR - 1, rationale: "", suggestion: "" },
        dynamicCriteria: [],
        refinedPrompt: "test",
      },
      80,
    );
    expect(a.ready).toBe(false);
  });

  it("stamps the active threshold on the result", () => {
    const a = finalizeAssessment(
      {
        projectType: "App",
        clarity: { score: 70, rationale: "", suggestion: "" },
        conciseness: { score: 70, rationale: "", suggestion: "" },
        dynamicCriteria: [],
        refinedPrompt: "test",
      },
      75,
    );
    expect(a.threshold).toBe(75);
  });

  it("falls back to DEFAULT_THRESHOLD when none is passed", () => {
    const a = finalizeAssessment({
      projectType: "App",
      clarity: { score: 50, rationale: "", suggestion: "" },
      conciseness: { score: 50, rationale: "", suggestion: "" },
      dynamicCriteria: [],
      refinedPrompt: "test",
    });
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});
