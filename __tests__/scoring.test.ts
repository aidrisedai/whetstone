import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("clamps values below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps values above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.6)).toBe(73));
  it("passes valid values through", () => expect(clamp(50)).toBe(50));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number types", () => expect(clamp("bad" as unknown as number)).toBe(0));
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns the mean rounded", () => expect(computeOverall([70, 80, 90])).toBe(80));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("handles a single value", () => expect(computeOverall([77])).toBe(77));
  it("rounds 0.5 up", () => expect(computeOverall([75, 76])).toBe(76));
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores above floor", () => {
    expect(isReady(82, [82, 80, 70], 80)).toBe(true);
  });
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 80, 70], 80)).toBe(false);
  });
  it("returns false when one score is below DIMENSION_FLOOR", () => {
    // DIMENSION_FLOOR = 65; one score is 60
    expect(isReady(82, [82, 80, 60], 80)).toBe(false);
  });
  it("returns false for empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
  it("uses the supplied threshold, not DEFAULT_THRESHOLD", () => {
    expect(isReady(70, [70, 70], 70)).toBe(true);
  });
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic scores", () => {
    const dynamic: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "a", score: 75, rationale: "", suggestion: "" },
    ];
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: dynamic,
    });
    expect(scores).toEqual([80, 70, 75]);
  });

  it("clamps scores that are out of range", () => {
    const scores = dimensionScores({
      clarity: { score: 120, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: { score: 85, rationale: "r", suggestion: "s" },
    conciseness: { score: 75, rationale: "r", suggestion: "s" },
    dynamicCriteria: [] as DynamicCriterion[],
    refinedPrompt: "Build something.",
  };

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(80); // mean(85, 75) = 80
  });

  it("sets ready=true when threshold met and floor cleared", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.ready).toBe(true);
  });

  it("stamps the active threshold", () => {
    const a = finalizeAssessment(raw, 75);
    expect(a.threshold).toBe(75);
  });

  it("sets ready=false when overall < threshold", () => {
    const low = { ...raw, clarity: { ...raw.clarity, score: 60 } };
    const a = finalizeAssessment(low, 80);
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const over = { ...raw, clarity: { ...raw.clarity, score: 200 } };
    const a = finalizeAssessment(over, 80);
    expect(a.clarity.score).toBe(100);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const a = finalizeAssessment(raw);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeCrit = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates items by key", () => {
    const items = [makeCrit("a", 70), makeCrit("a", 80), makeCrit("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((c) => c.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = [makeCrit("a", 70), makeCrit("b", 60), makeCrit("c", 55), makeCrit("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks keys from prior criteria and pulls latest scores", () => {
    const prior: CriterionSpec[] = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
    ];
    const items = [makeCrit("define_audience", 88), makeCrit("success_criteria", 77)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((c) => c.key)).toEqual(["define_audience", "success_criteria"]);
    expect(result[0].score).toBe(88);
    expect(result[1].score).toBe(77);
  });

  it("uses locked labels/bestPractice from prior, not the model's echo", () => {
    const prior: CriterionSpec[] = [
      { key: "define_audience", label: "Audience (locked)", bestPractice: "define_audience" },
    ];
    const items = [{ ...makeCrit("define_audience", 80), label: "Model's label" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Audience (locked)");
  });

  it("returns empty array for undefined/non-array input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("falls back to positional match if prior key is missing from model response", () => {
    const prior: CriterionSpec[] = [
      { key: "missing_key", label: "Missing", bestPractice: "missing_key" },
    ];
    const items = [makeCrit("other_key", 55)];
    const result = normalizeDynamicCriteria(items, prior);
    // Falls back to deduped[0] = "other_key" value; key locked to "missing_key"
    expect(result[0].key).toBe("missing_key");
    expect(result[0].score).toBe(55);
  });
});

// ── constants ─────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80 when env is unset", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
