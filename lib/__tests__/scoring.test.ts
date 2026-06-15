import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

describe("clamp", () => {
  it("clamps values to 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(73.6)).toBe(74);
    expect(clamp(73.4)).toBe(73);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
    expect(computeOverall([100])).toBe(100);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the average", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 → 81
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(85, [85, 70, 80], 80)).toBe(true);
  });

  it("returns false when overall < threshold", () => {
    expect(isReady(79, [79, 80, 80], 80)).toBe(false);
  });

  it("returns false when any score is below the floor", () => {
    expect(isReady(85, [85, 64, 85], 80)).toBe(false);
    expect(isReady(85, [85, DIMENSION_FLOOR, 85], 80)).toBe(true);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("returns clamped scores for fixed + dynamic dimensions", () => {
    const dynamic: DynamicCriterion[] = [
      { key: "feasibility", label: "Feasibility", bestPractice: "", score: 75, rationale: "", suggestion: "" },
    ];
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 90, rationale: "", suggestion: "" },
      dynamicCriteria: dynamic,
    });
    expect(result).toEqual([80, 90, 75]);
  });

  it("clamps scores that are out of range", () => {
    const result = dimensionScores({
      clarity: { score: 120, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "web app",
    refinedPrompt: "A refined idea",
    clarity: { score: 85, rationale: "Clear", suggestion: "Good" },
    conciseness: { score: 75, rationale: "OK", suggestion: "Tighten" },
    dynamicCriteria: [
      { key: "feasibility", label: "Feasibility", bestPractice: "", score: 80, rationale: "", suggestion: "" },
    ] as DynamicCriterion[],
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(base);
    // 85 + 75 + 80 = 240 / 3 = 80
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when threshold and floor are met", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const lowBase = {
      projectType: base.projectType,
      refinedPrompt: base.refinedPrompt,
      clarity: { ...base.clarity, score: 60 },
      conciseness: { ...base.conciseness, score: 60 },
      dynamicCriteria: [{ ...base.dynamicCriteria[0], score: 60 }],
    };
    const result = finalizeAssessment(lowBase, 80);
    expect(result.ready).toBe(false);
    expect(result.overall).toBe(60);
  });

  it("stamps the active threshold on the result", () => {
    expect(finalizeAssessment(base, 75).threshold).toBe(75);
    expect(finalizeAssessment(base, 90).threshold).toBe(90);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const oob = {
      projectType: base.projectType,
      refinedPrompt: base.refinedPrompt,
      clarity: { ...base.clarity, score: 200 },
      conciseness: { ...base.conciseness, score: -20 },
      dynamicCriteria: [{ ...base.dynamicCriteria[0], score: 80 }],
    };
    const result = finalizeAssessment(oob);
    // clamped: 100, 0, 80 → mean = 60
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(60);
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeItem = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: "",
    score,
    rationale: "",
    suggestion: "",
  });

  const makeSpec = (key: string): CriterionSpec => ({
    key,
    label: key,
    bestPractice: "",
  });

  it("deduplicates by key (first occurrence wins)", () => {
    const items = [makeItem("a", 70), makeItem("a", 80), makeItem("b", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(2);
    expect(result[0].score).toBe(70); // first 'a' wins
  });

  it("caps to 3 items when there is no prior", () => {
    const items = [makeItem("a", 70), makeItem("b", 80), makeItem("c", 90), makeItem("d", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior order and keys when prior exists", () => {
    const prior: CriterionSpec[] = [makeSpec("x"), makeSpec("y")];
    const items = [makeItem("y", 85), makeItem("x", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(85);
  });

  it("returns empty array for undefined/null input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters out items with non-string keys", () => {
    const items = [{ key: 123 as unknown as string, label: "", bestPractice: "", score: 50, rationale: "", suggestion: "" }];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(0);
  });
});
