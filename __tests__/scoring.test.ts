import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { CriterionSpec, DynamicCriterion } from "@/lib/types";

describe("clamp", () => {
  it("rounds to nearest integer within [0, 100]", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });
  it("clamps negatives to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps over-100 to 100", () => expect(clamp(150)).toBe(100));
  it("handles exactly 0 and 100", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-numbers", () => expect(clamp("abc" as unknown as number)).toBe(0));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the value for a single score", () => expect(computeOverall([70])).toBe(70));
  it("averages correctly", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([60, 61])).toBe(61));
});

describe("isReady", () => {
  const threshold = 80;
  it("is false when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], threshold)).toBe(false);
  });
  it("is true when overall meets threshold and all dimensions clear the floor", () => {
    expect(isReady(80, [80, 80, 80], threshold)).toBe(true);
  });
  it("is false when any dimension is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [90, 90, DIMENSION_FLOOR - 1], threshold)).toBe(false);
  });
  it("is true at exactly the floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR, 80], threshold)).toBe(true);
  });
  it("is false for empty scores array", () => {
    expect(isReady(80, [], threshold)).toBe(false);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("is a number between 1 and 100", () => {
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(100);
  });
});

function makeDim(score: number) {
  return { score, rationale: "r", suggestion: "s" };
}
function makeDynamic(key: string, score: number): DynamicCriterion {
  return { key, label: key, bestPractice: key, score, rationale: "r", suggestion: "s" };
}

describe("finalizeAssessment", () => {
  it("computes overall as the mean of all dimension scores", () => {
    const a = finalizeAssessment({
      projectType: "Web app",
      clarity: makeDim(80),
      conciseness: makeDim(80),
      dynamicCriteria: [makeDynamic("k1", 80)],
      refinedPrompt: "Test",
    });
    expect(a.overall).toBe(80);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps scores before computing overall", () => {
    const a = finalizeAssessment({
      projectType: "Game",
      clarity: makeDim(200),
      conciseness: makeDim(-10),
      dynamicCriteria: [],
      refinedPrompt: "Test",
    });
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
    expect(a.overall).toBe(50);
  });

  it("sets ready=true when threshold met and all dims above floor", () => {
    const a = finalizeAssessment(
      {
        projectType: "Web app",
        clarity: makeDim(85),
        conciseness: makeDim(85),
        dynamicCriteria: [makeDynamic("k1", 85)],
        refinedPrompt: "Test",
      },
      80,
    );
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when a dim is below floor even if overall passes", () => {
    const a = finalizeAssessment(
      {
        projectType: "Web app",
        clarity: makeDim(100),
        conciseness: makeDim(100),
        dynamicCriteria: [makeDynamic("k1", 60)],
        refinedPrompt: "Test",
      },
      80,
    );
    expect(a.ready).toBe(false);
  });

  it("accepts a custom threshold", () => {
    const a = finalizeAssessment(
      {
        projectType: "Web app",
        clarity: makeDim(70),
        conciseness: makeDim(70),
        dynamicCriteria: [],
        refinedPrompt: "Test",
      },
      65,
    );
    expect(a.ready).toBe(true);
    expect(a.threshold).toBe(65);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "clarity", label: "Clarity", bestPractice: "clarity" },
    { key: "scope", label: "Scope", bestPractice: "scope" },
  ];

  it("deduplicates by key (first occurrence wins)", () => {
    const items: DynamicCriterion[] = [
      makeDynamic("clarity", 70),
      makeDynamic("clarity", 50),
      makeDynamic("scope", 60),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items: DynamicCriterion[] = [
      makeDynamic("a", 60),
      makeDynamic("b", 70),
      makeDynamic("c", 80),
      makeDynamic("d", 90),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs when prior is provided", () => {
    const items: DynamicCriterion[] = [
      makeDynamic("scope", 88),
      makeDynamic("clarity", 77),
    ];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("clarity");
    expect(result[0].score).toBe(77);
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(88);
  });

  it("handles undefined/null items gracefully", () => {
    expect(() => normalizeDynamicCriteria(undefined, null)).not.toThrow();
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("fills missing prior keys with score 0", () => {
    const items: DynamicCriterion[] = [makeDynamic("clarity", 70)];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result).toHaveLength(2);
    const scopeEntry = result.find((r) => r.key === "scope");
    expect(scopeEntry?.score).toBe(0);
  });
});
