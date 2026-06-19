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
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

describe("clamp", () => {
  it("clamps values to 0–100", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(50)).toBe(50);
    expect(clamp(50.7)).toBe(51);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the mean of scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
    expect(computeOverall([75, 85, 65])).toBe(75);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("is ready when overall >= threshold AND all scores >= DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, 80, 70], 80)).toBe(true);
  });

  it("is not ready when overall < threshold", () => {
    expect(isReady(75, [75, 75, 75], 80)).toBe(false);
  });

  it("is not ready when a dimension is below the floor", () => {
    expect(isReady(85, [85, 85, 60], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: { score: 82, rationale: "Clear", suggestion: "Be clearer" },
    conciseness: { score: 78, rationale: "Tight", suggestion: "Tighter" },
    dynamicCriteria: [
      {
        key: "define_audience",
        label: "Audience",
        bestPractice: "define_audience",
        score: 70,
        rationale: "ok",
        suggestion: "name the user",
      },
    ] as DynamicCriterion[],
    refinedPrompt: "Build a web app",
  };

  it("computes overall as the mean of all scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((82 + 78 + 70) / 3));
  });

  it("sets ready=true when threshold and floor are cleared", () => {
    const high = {
      ...base,
      clarity: { ...base.clarity, score: 88 },
      conciseness: { ...base.conciseness, score: 85 },
      dynamicCriteria: [{ ...base.dynamicCriteria[0], score: 82 }],
    };
    const result = finalizeAssessment(high, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when a dimension is under the floor", () => {
    const low = {
      ...base,
      clarity: { ...base.clarity, score: 90 },
      conciseness: { ...base.conciseness, score: 90 },
      dynamicCriteria: [{ ...base.dynamicCriteria[0], score: 60 }],
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const oor = {
      ...base,
      clarity: { ...base.clarity, score: 150 },
      conciseness: { ...base.conciseness, score: -5 },
    };
    const result = finalizeAssessment(oor);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const d1: DynamicCriterion = {
    key: "define_audience",
    label: "Audience",
    bestPractice: "define_audience",
    score: 70,
    rationale: "r",
    suggestion: "s",
  };
  const d2: DynamicCriterion = {
    key: "success_criteria",
    label: "Success",
    bestPractice: "success_criteria",
    score: 80,
    rationale: "r2",
    suggestion: "s2",
  };

  it("deduplicates by key on the first assessment (no prior)", () => {
    const dupes = [d1, { ...d1, score: 50 }, d2];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("define_audience");
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 on the first assessment", () => {
    const four = [d1, d2, { ...d1, key: "c", label: "C" }, { ...d1, key: "d", label: "D" }];
    expect(normalizeDynamicCriteria(four, null)).toHaveLength(3);
  });

  it("locks to prior keys when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
    ];
    const result = normalizeDynamicCriteria([d2, d1], prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("define_audience");
    expect(result[1].key).toBe("success_criteria");
  });

  it("preserves prior label/bestPractice even when model changes them", () => {
    const prior: CriterionSpec[] = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const tampered = [{ ...d1, label: "TAMPERED", bestPractice: "TAMPERED" }];
    const result = normalizeDynamicCriteria(tampered, prior);
    expect(result[0].label).toBe("Audience");
    expect(result[0].bestPractice).toBe("define_audience");
  });

  it("handles undefined/null gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

describe("DIMENSION_FLOOR", () => {
  it("is defined and positive", () => {
    expect(DIMENSION_FLOOR).toBeGreaterThan(0);
    expect(DIMENSION_FLOOR).toBeLessThan(100);
  });
});
