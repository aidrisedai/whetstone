import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "be_clear_and_direct",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("keeps 0–100 intact", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns single value unchanged", () => expect(computeOverall([80])).toBe(80));
  it("averages correctly", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([60, 61])).toBe(61));
});

describe("dimensionScores", () => {
  it("extracts and clamps all scores", () => {
    const result = dimensionScores({
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [dynDim("a", 75)],
    });
    expect(result).toEqual([100, 0, 75]);
  });
});

describe("isReady", () => {
  it("returns false when scores is empty", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns false when overall < threshold", () => expect(isReady(79, [80, 80, 80], 80)).toBe(false));
  it("returns false when a dimension is below floor", () => {
    expect(isReady(85, [85, 85, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
  it("returns true when overall meets threshold and all dims meet floor", () => {
    expect(isReady(80, [80, 80, DIMENSION_FLOOR], 80)).toBe(true);
  });
  it("returns true well above threshold", () => {
    expect(isReady(95, [90, 92, 90], 80)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Game",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("core_mechanic", 80)],
    refinedPrompt: "Build a game",
  };

  it("computes overall from clamped dimensions", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(Math.round((85 + 75 + 80) / 3));
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(raw, 72);
    expect(a.threshold).toBe(72);
  });

  it("marks ready=false when below threshold", () => {
    const a = finalizeAssessment({ ...raw, clarity: dim(50), conciseness: dim(50), dynamicCriteria: [dynDim("k", 50)] }, 80);
    expect(a.ready).toBe(false);
  });

  it("marks ready=true when all criteria pass", () => {
    const high = finalizeAssessment(
      { ...raw, clarity: dim(90), conciseness: dim(85), dynamicCriteria: [dynDim("k", 82)] },
      80,
    );
    expect(high.ready).toBe(true);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("a", 70),
    dynDim("b", 80),
    dynDim("c", 90),
    dynDim("d", 60),
  ];

  it("caps first-pass to 3 items", () => {
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("deduplicates by key on first pass", () => {
    const dupes = [dynDim("a", 70), dynDim("a", 90), dynDim("b", 60)];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("locks to prior keys when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "A", bestPractice: "be_clear_and_direct" },
      { key: "b", label: "B", bestPractice: "provide_context" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
  });

  it("uses stable prior label and bestPractice regardless of model echo", () => {
    const prior: CriterionSpec[] = [{ key: "a", label: "Stable Label", bestPractice: "success_criteria" }];
    const incoming: DynamicCriterion[] = [{ ...dynDim("a", 88), label: "Changed Label", bestPractice: "changed" }];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result[0].label).toBe("Stable Label");
    expect(result[0].bestPractice).toBe("success_criteria");
    expect(result[0].score).toBe(88);
  });

  it("handles empty/undefined input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
