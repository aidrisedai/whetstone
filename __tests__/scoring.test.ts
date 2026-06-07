import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
  dimensionScores,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

const CRITERIA_SPEC: CriterionSpec[] = [
  { key: "clarity", label: "Clarity", bestPractice: "be_clear_and_direct" },
  { key: "audience", label: "Audience", bestPractice: "define_audience" },
];

function makeDynamic(key: string, score: number): DynamicCriterion {
  return { key, label: key, bestPractice: key, score, rationale: "", suggestion: "" };
}

describe("clamp", () => {
  it("passes values already in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds to integer", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number types", () => {
    expect(clamp("hello" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the single value for a single-element array", () => {
    expect(computeOverall([70])).toBe(70);
  });

  it("computes the mean and rounds", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([60, 80, 70])).toBe(70);
  });

  it("rounds .5 up", () => {
    expect(computeOverall([60, 61])).toBe(61);
  });
});

describe("isReady", () => {
  const threshold = 80;

  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(85, [80, 90, 75], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 90, 80], threshold)).toBe(false);
  });

  it("returns false when any single score is below the floor", () => {
    expect(isReady(85, [80, 90, 64], threshold)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });

  it("exact threshold passes", () => {
    expect(isReady(80, [80, 80, 80], threshold)).toBe(true);
  });

  it("exact floor passes", () => {
    expect(isReady(80, [65, 80, 80], threshold)).toBe(true);
  });

  it("floor - 1 fails", () => {
    expect(isReady(80, [64, 80, 80], threshold)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("combines clarity, conciseness, and dynamic criteria", () => {
    const result = dimensionScores({
      clarity: { score: 70, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: [makeDynamic("a", 90)],
    });
    expect(result).toEqual([70, 80, 90]);
  });

  it("clamps scores in the process", () => {
    const result = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key (first occurrence wins)", () => {
    const items = [
      makeDynamic("a", 70),
      makeDynamic("a", 80), // duplicate
      makeDynamic("b", 60),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first wins
    expect(result[1].key).toBe("b");
  });

  it("caps first assessment to 3 when no prior criteria", () => {
    const items = [
      makeDynamic("a", 70),
      makeDynamic("b", 70),
      makeDynamic("c", 70),
      makeDynamic("d", 70),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria order when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B Label", bestPractice: "b_bp" },
      { key: "a", label: "A Label", bestPractice: "a_bp" },
    ];
    const items = [makeDynamic("a", 80), makeDynamic("b", 90), makeDynamic("c", 70)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("b");
    expect(result[0].label).toBe("B Label");
    expect(result[0].score).toBe(90);
    expect(result[1].key).toBe("a");
    expect(result[1].label).toBe("A Label");
    expect(result[1].score).toBe(80);
  });

  it("returns empty array for undefined input with no prior", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});

describe("finalizeAssessment", () => {
  const RAW = {
    projectType: "Web app",
    clarity: { score: 85, rationale: "good", suggestion: "ok" },
    conciseness: { score: 75, rationale: "ok", suggestion: "trim" },
    dynamicCriteria: [
      makeDynamic("audience", 80),
      makeDynamic("scope", 70),
    ],
    refinedPrompt: "Build a task tracker.",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(RAW, 80);
    // scores: [85, 75, 80, 70] → mean = 77.5 → 78
    expect(result.overall).toBe(78);
  });

  it("stamps the threshold", () => {
    expect(finalizeAssessment(RAW, 80).threshold).toBe(80);
    expect(finalizeAssessment(RAW, 75).threshold).toBe(75);
  });

  it("marks ready when overall >= threshold and all scores >= floor", () => {
    const highRaw = {
      ...RAW,
      clarity: { score: 88, rationale: "", suggestion: "" },
      conciseness: { score: 85, rationale: "", suggestion: "" },
      dynamicCriteria: [makeDynamic("a", 82), makeDynamic("b", 80)],
    };
    const result = finalizeAssessment(highRaw, 80);
    // scores: [88, 85, 82, 80] → mean = 83.75 → 84; all >= 65; overall >= 80
    expect(result.ready).toBe(true);
  });

  it("marks not ready when overall is below threshold", () => {
    expect(finalizeAssessment(RAW, 80).ready).toBe(false);
  });

  it("clamps individual scores that are out of range", () => {
    const rawOutOfRange = {
      ...RAW,
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [makeDynamic("a", 200)],
    };
    const result = finalizeAssessment(rawOutOfRange, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.dynamicCriteria[0].score).toBe(100);
  });

  it("uses DEFAULT_THRESHOLD when none is specified", () => {
    const result = finalizeAssessment(RAW);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("constants", () => {
  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });

  it("DEFAULT_THRESHOLD is a valid integer in 1..100", () => {
    expect(Number.isInteger(DEFAULT_THRESHOLD)).toBe(true);
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(100);
  });
});
