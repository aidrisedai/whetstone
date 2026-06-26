import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps values below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps values above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds 72.6 up to 73", () => expect(clamp(72.6)).toBe(73));
  it("rounds 72.4 down to 72", () => expect(clamp(72.4)).toBe(72));
  it("passes through boundary 0", () => expect(clamp(0)).toBe(0));
  it("passes through boundary 100", () => expect(clamp(100)).toBe(100));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number input", () => expect(clamp("abc" as unknown as number)).toBe(0));
});

describe("computeOverall", () => {
  it("averages three scores", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("handles a single score", () => expect(computeOverall([85])).toBe(85));
  it("returns 0 for an empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds the mean correctly", () => expect(computeOverall([70, 71])).toBe(71));
  it("rounds 70.5 to 71", () => expect(computeOverall([70, 71])).toBe(71));
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });
  it("returns false when overall is one point below threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });
  it("returns false when any score is one below the floor (64 < 65)", () => {
    expect(isReady(80, [80, 64, 75], 80)).toBe(false);
  });
  it("returns false for an empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
  it("allows exactly the floor value (65) to pass", () => {
    expect(DIMENSION_FLOOR).toBe(65);
    expect(isReady(80, [80, 65, 75], 80)).toBe(true);
  });
  it("supports custom thresholds", () => {
    expect(isReady(70, [70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70], 75)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  it("clamps scores and computes the correct overall mean", () => {
    const raw = {
      projectType: "web",
      clarity: makeDim(85),
      conciseness: makeDim(75),
      dynamicCriteria: [makeDynamic("specificity", 80)],
      refinedPrompt: "A todo app",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(85);
    expect(result.conciseness.score).toBe(75);
    expect(result.overall).toBe(80); // mean(85, 75, 80) = 80
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("marks not ready when a score dips below the floor", () => {
    const raw = {
      projectType: "web",
      clarity: makeDim(90),
      conciseness: makeDim(60),
      dynamicCriteria: [makeDynamic("specificity", 90)],
      refinedPrompt: "A todo app",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const raw = {
      projectType: "web",
      clarity: makeDim(120),
      conciseness: makeDim(-5),
      dynamicCriteria: [],
      refinedPrompt: "test",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("preserves all non-score fields on clarity and conciseness", () => {
    const raw = {
      projectType: "mobile",
      clarity: { score: 70, rationale: "good", suggestion: "improve X" },
      conciseness: { score: 75, rationale: "ok", suggestion: "cut Y" },
      dynamicCriteria: [],
      refinedPrompt: "some prompt",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.rationale).toBe("good");
    expect(result.conciseness.suggestion).toBe("cut Y");
    expect(result.projectType).toBe("mobile");
  });
});

describe("normalizeDynamicCriteria", () => {
  it("returns up to 3 criteria on first assessment (no prior)", () => {
    const items = [
      makeDynamic("a", 80),
      makeDynamic("b", 70),
      makeDynamic("c", 75),
      makeDynamic("d", 65),
    ];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("deduplicates by key, keeping the first occurrence", () => {
    const items = [makeDynamic("a", 80), makeDynamic("a", 90), makeDynamic("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80);
  });

  it("locks to prior criteria order and keys", () => {
    const prior: CriterionSpec[] = [
      { key: "specificity", label: "Specificity", bestPractice: "bp1" },
      { key: "output_clarity", label: "Output Clarity", bestPractice: "bp2" },
    ];
    const items = [makeDynamic("output_clarity", 90), makeDynamic("specificity", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("specificity");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("output_clarity");
    expect(result[1].score).toBe(90);
  });

  it("uses prior label and bestPractice, not the model's returned values", () => {
    const prior: CriterionSpec[] = [
      { key: "specificity", label: "Official Label", bestPractice: "Official BP" },
    ];
    const items = [{ ...makeDynamic("specificity", 70), label: "Wrong Label", bestPractice: "Wrong BP" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Official Label");
    expect(result[0].bestPractice).toBe("Official BP");
  });

  it("handles undefined items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters out items without a string key", () => {
    const items = [
      { key: 123 as unknown as string, label: "bad", bestPractice: "bp", score: 70, rationale: "", suggestion: "" },
      makeDynamic("valid", 80),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("valid");
  });
});
