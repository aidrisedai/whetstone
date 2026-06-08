import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { CriterionSpec, DynamicCriterion } from "@/lib/types";

const dynBase: DynamicCriterion = {
  key: "audience",
  label: "Audience",
  bestPractice: "define_audience",
  score: 75,
  rationale: "ok",
  suggestion: "be more specific",
};

describe("clamp", () => {
  it("passes values in range unchanged", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });
  it("clamps negative numbers to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps values over 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(73.7)).toBe(74));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("oops" as unknown as number)).toBe(0));
});

describe("computeOverall", () => {
  it("returns mean of scores", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("rounds half-up", () => expect(computeOverall([71, 70])).toBe(71));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("handles single-element array", () => expect(computeOverall([88])).toBe(88));
});

describe("isReady", () => {
  it("requires overall ≥ threshold", () => {
    expect(isReady(79, [79, 70, 70], 80)).toBe(false);
    expect(isReady(80, [80, 70, 70], 80)).toBe(true);
  });
  it("requires every dimension ≥ DIMENSION_FLOOR (65)", () => {
    expect(isReady(85, [85, 64, 70], 80)).toBe(false);
    expect(isReady(85, [85, 65, 70], 80)).toBe(true);
  });
  it("returns false for empty scores array", () => expect(isReady(80, [], 80)).toBe(false));
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: { score: 90, rationale: "clear", suggestion: "none" },
    conciseness: { score: 85, rationale: "tight", suggestion: "none" },
    dynamicCriteria: [{ ...dynBase, score: 80 }],
    refinedPrompt: "Build a web app.",
  };

  it("clamps all dimension scores", () => {
    const out = finalizeAssessment({
      ...raw,
      clarity: { ...raw.clarity, score: 150 },
    });
    expect(out.clarity.score).toBe(100);
  });

  it("computes overall as mean of all dimensions", () => {
    const out = finalizeAssessment(raw);
    expect(out.overall).toBe(Math.round((90 + 85 + 80) / 3));
  });

  it("sets ready=true when overall and all dims clear thresholds", () => {
    const out = finalizeAssessment(raw, 80);
    expect(out.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const out = finalizeAssessment({
      ...raw,
      clarity: { ...raw.clarity, score: 50 },
      conciseness: { ...raw.conciseness, score: 50 },
      dynamicCriteria: [{ ...dynBase, score: 50 }],
    });
    expect(out.ready).toBe(false);
  });

  it("stamps the active threshold on the result", () => {
    expect(finalizeAssessment(raw, 75).threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none supplied", () => {
    expect(finalizeAssessment(raw).threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "audience", label: "Audience", bestPractice: "define_audience" },
    { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
  ];

  const items: DynamicCriterion[] = [
    { ...dynBase, key: "audience", score: 70 },
    { ...dynBase, key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope", score: 68 },
  ];

  it("deduplicates items by key (first wins)", () => {
    const duped = [...items, { ...dynBase, key: "audience", score: 55 }];
    const out = normalizeDynamicCriteria(duped, null);
    expect(out.filter((x) => x.key === "audience")).toHaveLength(1);
    expect(out.find((x) => x.key === "audience")?.score).toBe(70);
  });

  it("caps to 3 items when no prior criteria", () => {
    const many: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      ...dynBase,
      key: `k${i}`,
      label: `Label ${i}`,
    }));
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("locks to prior criteria order and labels when prior is set", () => {
    const out = normalizeDynamicCriteria(items, specs);
    expect(out.map((x) => x.key)).toEqual(["audience", "scope"]);
    expect(out[0].label).toBe("Audience");
    expect(out[0].score).toBe(70);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("uses prior spec label/key even if model returns nothing for that key", () => {
    const out = normalizeDynamicCriteria([], specs);
    expect(out).toHaveLength(2);
    expect(out[0].key).toBe("audience");
    expect(out[0].score).toBe(0);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is a number between 1 and 100", () => {
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(100);
  });
  it("DIMENSION_FLOOR is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
