import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, DynamicCriterion, CriterionSpec } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps values to 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("handles non-numeric values", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as never)).toBe(0);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.6)).toBe(51);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty scores", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("computes the mean rounded", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([70, 75, 80])).toBe(75);
  });

  it("rounds the mean correctly", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 rounds to 71
  });
});

describe("isReady", () => {
  it("is not ready with empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("is ready when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });

  it("is not ready when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });

  it("is not ready when any score is below the floor (65)", () => {
    expect(isReady(80, [80, 80, 64], 80)).toBe(false);
  });

  it("requires BOTH conditions together", () => {
    expect(isReady(85, [70, 64, 70], 80)).toBe(false);
    expect(isReady(79, [70, 70, 70], 80)).toBe(false);
    expect(isReady(80, [65, 65, 80], 80)).toBe(true);
  });
});

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores", () => {
    const result = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dyn("a", 90), dyn("b", 60)],
    });
    expect(result).toEqual([70, 80, 90, 60]);
  });

  it("clamps all scores", () => {
    const result = dimensionScores({
      clarity: dim(-5),
      conciseness: dim(110),
      dynamicCriteria: [],
    });
    expect(result).toEqual([0, 100]);
  });
});

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Web App",
    clarity: dim(85),
    conciseness: dim(80),
    dynamicCriteria: [dyn("define_audience", 80), dyn("success_criteria", 75)],
    refinedPrompt: "Build a todo app",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(80); // mean(85, 80, 80, 75) = 80
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("sets ready=true when threshold and floor conditions are met", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(base, 90);
    expect(result.ready).toBe(false);
  });

  it("sets ready=false when a dimension is below the floor", () => {
    const weakBase = {
      ...base,
      dynamicCriteria: [dyn("define_audience", 64), dyn("success_criteria", 90)],
    };
    const result = finalizeAssessment(weakBase, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps scores out of range", () => {
    const outOfRange = {
      ...base,
      clarity: dim(150),
      conciseness: dim(-20),
    };
    const result = finalizeAssessment(outOfRange, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when no threshold arg given", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("deduplicates by key", () => {
    const items = [dyn("a", 70), dyn("a", 80), dyn("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = [dyn("a", 70), dyn("b", 80), dyn("c", 60), dyn("d", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs when prior exists", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "Audience", bestPractice: "define_audience" },
      { key: "b", label: "Scope", bestPractice: "set_constraints_and_scope" },
    ];
    const items = [dyn("a", 85), dyn("b", 75), dyn("c", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    // Should respect prior ordering and keys
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].label).toBe("Audience"); // label from prior
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(75);
    // "c" is not in prior, so it's excluded
    expect(result.find((r) => r.key === "c")).toBeUndefined();
  });

  it("uses a fallback score when a prior key is missing from new items", () => {
    const prior: CriterionSpec[] = [
      { key: "missing", label: "Missing", bestPractice: "be_clear_and_direct" },
    ];
    const items: DynamicCriterion[] = [];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].score).toBe(0);
    expect(result[0].key).toBe("missing");
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
