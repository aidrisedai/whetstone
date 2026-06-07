import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

describe("clamp", () => {
  it("clamps values within 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });

  it("handles NaN and non-numbers gracefully", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the mean of all scores", () => {
    expect(computeOverall([80, 60, 70])).toBe(70);
    expect(computeOverall([100, 100])).toBe(100);
    expect(computeOverall([0, 0, 0])).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 rounds to 81
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all dimensions clear floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
    expect(isReady(90, [90, 80, 85], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 70, 75], 80)).toBe(false);
  });

  it("returns false when any dimension is below the floor (65)", () => {
    expect(isReady(80, [80, 64, 75], 80)).toBe(false); // 64 < DIMENSION_FLOOR
    expect(isReady(80, [80, 65, 75], 80)).toBe(true);  // 65 == DIMENSION_FLOOR ✓
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("uses custom threshold", () => {
    expect(isReady(70, [70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70], 75)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("extracts all scores into a flat array", () => {
    const input = {
      clarity: { score: 75, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "a", score: 70, rationale: "", suggestion: "" },
        { key: "b", label: "B", bestPractice: "b", score: 65, rationale: "", suggestion: "" },
      ] as DynamicCriterion[],
    };
    expect(dimensionScores(input)).toEqual([75, 80, 70, 65]);
  });

  it("clamps each score", () => {
    const input = {
      clarity: { score: 105, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    };
    expect(dimensionScores(input)).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "Web app",
    clarity: { score: 85, rationale: "Clear", suggestion: "Keep going" },
    conciseness: { score: 78, rationale: "Tight", suggestion: "Cut more" },
    dynamicCriteria: [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience", score: 82, rationale: "Good", suggestion: "Name them" },
    ] as DynamicCriterion[],
    refinedPrompt: "Build a todo app for students.",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    // [85, 78, 82] → mean = 81.67 → 82
    expect(result.overall).toBe(82);
  });

  it("sets ready=true when threshold met and all above floor", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low = {
      ...baseRaw,
      clarity: { ...baseRaw.clarity, score: 50 },
      conciseness: { ...baseRaw.conciseness, score: 50 },
      dynamicCriteria: [{ ...baseRaw.dynamicCriteria[0], score: 50 }],
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("sets ready=false when a dimension is below the floor", () => {
    const withWeakDim = {
      ...baseRaw,
      conciseness: { ...baseRaw.conciseness, score: 60 }, // below 65 floor
    };
    const result = finalizeAssessment(withWeakDim, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps threshold on the result", () => {
    expect(finalizeAssessment(baseRaw, 75).threshold).toBe(75);
    expect(finalizeAssessment(baseRaw, 90).threshold).toBe(90);
  });

  it("clamps out-of-range model scores", () => {
    const wild = {
      ...baseRaw,
      clarity: { ...baseRaw.clarity, score: 150 },
      conciseness: { ...baseRaw.conciseness, score: -20 },
    };
    const result = finalizeAssessment(wild, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const criteria: DynamicCriterion[] = [
    { key: "define_audience", label: "Audience", bestPractice: "define_audience", score: 70, rationale: "ok", suggestion: "name them" },
    { key: "success_criteria", label: "Success", bestPractice: "success_criteria", score: 75, rationale: "ok", suggestion: "define done" },
  ];

  const prior: CriterionSpec[] = [
    { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
    { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
  ];

  it("deduplicates by key on first assessment (no prior)", () => {
    const duped = [...criteria, { ...criteria[0], score: 99 }]; // duplicate key
    const result = normalizeDynamicCriteria(duped, null);
    expect(result.filter((c) => c.key === "define_audience")).toHaveLength(1);
    expect(result[0].score).toBe(70); // first occurrence kept
  });

  it("caps to 3 criteria on first assessment", () => {
    const many: DynamicCriterion[] = Array.from({ length: 6 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: `bp${i}`,
      score: 70,
      rationale: "",
      suggestion: "",
    }));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior spec keys in subsequent assessments", () => {
    const newItems: DynamicCriterion[] = [
      // model echoes the right ones but in wrong order + adds a new one
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria", score: 80, rationale: "better", suggestion: "done" },
      { key: "define_audience", label: "Audience", bestPractice: "define_audience", score: 77, rationale: "clearer", suggestion: "name" },
      { key: "rogue_key", label: "Rogue", bestPractice: "rogue", score: 99, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(newItems, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("define_audience"); // order locked to prior
    expect(result[1].key).toBe("success_criteria");
    expect(result.find((c) => c.key === "rogue_key")).toBeUndefined(); // rogue dropped
  });

  it("preserves prior spec labels even if model changes them", () => {
    const renamed: DynamicCriterion[] = [
      { key: "define_audience", label: "CHANGED LABEL", bestPractice: "define_audience", score: 72, rationale: "", suggestion: "" },
      { key: "success_criteria", label: "ALSO CHANGED", bestPractice: "success_criteria", score: 68, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(renamed, prior);
    expect(result[0].label).toBe("Audience");       // prior label preserved
    expect(result[1].label).toBe("Success");
  });

  it("handles undefined/null items array gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(null as unknown as DynamicCriterion[], null)).toEqual([]);
  });
});

describe("constants", () => {
  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });

  it("DEFAULT_THRESHOLD defaults to 80 when env var unset", () => {
    // In test env WHETSTONE_THRESHOLD is not set, so should default to 80.
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});
