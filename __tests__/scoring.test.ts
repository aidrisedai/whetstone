import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

describe("clamp", () => {
  it("clamps values below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps values above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("handles NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles non-number", () => expect(clamp("foo" as unknown as number)).toBe(0));
  it("passes through valid values", () => expect(clamp(50)).toBe(50));
  it("accepts boundary 0", () => expect(clamp(0)).toBe(0));
  it("accepts boundary 100", () => expect(clamp(100)).toBe(100));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds to nearest integer", () => expect(computeOverall([70, 71])).toBe(71));
  it("handles single score", () => expect(computeOverall([85])).toBe(85));
});

describe("isReady", () => {
  it("returns false when overall below threshold", () =>
    expect(isReady(79, [79, 79, 79], 80)).toBe(false));
  it("returns false when a dimension is below floor", () =>
    expect(isReady(85, [85, 85, 64], 80)).toBe(false));
  it("returns true when overall meets threshold and all dims above floor", () =>
    expect(isReady(80, [80, 80, 80], 80)).toBe(true));
  it("returns false for empty scores", () =>
    expect(isReady(90, [], 80)).toBe(false));
  it("respects custom threshold", () =>
    expect(isReady(75, [75, 75, 75], 75)).toBe(true));
});

describe("dimensionScores", () => {
  it("returns clamped scores for fixed + dynamic dimensions", () => {
    const clarity = { score: 80, rationale: "", suggestion: "" };
    const conciseness = { score: 70, rationale: "", suggestion: "" };
    const dynamicCriteria: DynamicCriterion[] = [
      { key: "k1", label: "K1", bestPractice: "bp", score: 110, rationale: "", suggestion: "" },
    ];
    expect(dimensionScores({ clarity, conciseness, dynamicCriteria })).toEqual([80, 70, 100]);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("defaults to 80", () => expect(DEFAULT_THRESHOLD).toBe(80));
});

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});

describe("finalizeAssessment", () => {
  const base = {
    refinedPrompt: "Build an app",
    projectType: "App",
    clarity: { score: 90, rationale: "clear", suggestion: "" },
    conciseness: { score: 85, rationale: "concise", suggestion: "" },
    dynamicCriteria: [
      { key: "mvp", label: "MVP", bestPractice: "bp", score: 75, rationale: "ok", suggestion: "" },
    ],
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(base);
    expect(result.overall).toBe(Math.round((90 + 85 + 75) / 3));
  });

  it("stamps the threshold", () => {
    expect(finalizeAssessment(base, 80).threshold).toBe(80);
    expect(finalizeAssessment(base, 90).threshold).toBe(90);
  });

  it("marks ready when overall >= threshold and all dims >= floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("marks not ready when a dim is below floor", () => {
    const lowDim = {
      ...base,
      dynamicCriteria: [
        { key: "mvp", label: "MVP", bestPractice: "bp", score: 50, rationale: "", suggestion: "" },
      ],
    };
    expect(finalizeAssessment(lowDim, 80).ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const raw = {
      ...base,
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "mvp", label: "MVP", bestPractice: "bp1", score: 70, rationale: "r", suggestion: "s" },
    { key: "ux", label: "UX", bestPractice: "bp2", score: 80, rationale: "r", suggestion: "s" },
    { key: "mvp", label: "MVP dup", bestPractice: "bp1", score: 60, rationale: "r", suggestion: "s" },
  ];

  it("deduplicates by key (keeps first)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["mvp", "ux"]);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 items when no prior", () => {
    const many: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `K${i}`,
      bestPractice: "bp",
      score: 70,
      rationale: "",
      suggestion: "",
    }));
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("locks to prior criteria order when prior is set", () => {
    const prior = [
      { key: "ux", label: "UX locked", bestPractice: "bp2" },
      { key: "mvp", label: "MVP locked", bestPractice: "bp1" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("ux");
    expect(result[1].key).toBe("mvp");
    expect(result[0].label).toBe("UX locked");
  });

  it("handles undefined input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
