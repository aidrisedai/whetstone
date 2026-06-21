import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes through values in range", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps values below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("rounds to integer", () => {
    expect(clamp(70.6)).toBe(71);
    expect(clamp(70.4)).toBe(70);
  });
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the value for a single-element array", () => {
    expect(computeOverall([80])).toBe(80);
  });

  it("returns the rounded mean", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("rounds fractional means", () => {
    // (80 + 81) / 2 = 80.5 → rounds to 81 (Math.round)
    expect(computeOverall([80, 81])).toBe(81);
  });
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = DEFAULT_THRESHOLD; // 80
  const floor = DIMENSION_FLOOR;       // 65

  it("returns false for empty scores", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });

  it("returns true when overall ≥ threshold AND all scores ≥ floor", () => {
    expect(isReady(80, [80, 80, 80], threshold)).toBe(true);
    expect(isReady(95, [70, 75, 80], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], threshold)).toBe(false);
  });

  it("returns false when any score is below the floor, even if overall ≥ threshold", () => {
    // overall = 90 but one dim is 64 — below floor
    expect(isReady(90, [64, 95, 100], threshold)).toBe(false);
  });

  it("returns true exactly at the threshold", () => {
    expect(isReady(80, [65, 80, 90], threshold)).toBe(true);
  });

  it("returns true when every score is exactly at the floor", () => {
    // overall=80, all dims at floor=65 — both gates pass
    expect(isReady(80, [65, 65, 65], threshold)).toBe(true);
  });

  it("returns false when one score is one below the floor", () => {
    expect(isReady(80, [64, 90, 90], threshold)).toBe(false);
  });

  it("returns true with mixed scores all above the floor", () => {
    expect(isReady(85, [65, 90, 90], threshold)).toBe(true);
  });
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  const dyn: DynamicCriterion = {
    key: "define_audience",
    label: "Audience",
    bestPractice: "define_audience",
    score: 75,
    rationale: "ok",
    suggestion: "be clearer",
  };

  it("returns clarity + conciseness + dynamic scores in order", () => {
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [dyn],
    });
    expect(result).toEqual([80, 70, 75]);
  });

  it("clamps each score", () => {
    const result = dimensionScores({
      clarity: { score: 110, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const makeDyn = (score: number): DynamicCriterion => ({
    key: "define_audience",
    label: "Audience",
    bestPractice: "define_audience",
    score,
    rationale: "",
    suggestion: "",
  });

  const baseRaw = {
    projectType: "Web app",
    clarity: { score: 85, rationale: "clear", suggestion: "none" },
    conciseness: { score: 75, rationale: "tight", suggestion: "none" },
    dynamicCriteria: [makeDyn(80)],
    refinedPrompt: "Build an app",
  };

  it("computes overall as the mean of all dimensions", () => {
    const a = finalizeAssessment(baseRaw, 80);
    // (85 + 75 + 80) / 3 = 80
    expect(a.overall).toBe(80);
  });

  it("sets ready=true when overall ≥ threshold and all scores ≥ floor", () => {
    const a = finalizeAssessment(baseRaw, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall < threshold", () => {
    const a = finalizeAssessment({ ...baseRaw, clarity: { score: 50, rationale: "", suggestion: "" } }, 80);
    expect(a.ready).toBe(false);
  });

  it("stamps the active threshold onto the result", () => {
    expect(finalizeAssessment(baseRaw, 75).threshold).toBe(75);
    expect(finalizeAssessment(baseRaw, 85).threshold).toBe(85);
  });

  it("clamps out-of-range scores", () => {
    const a = finalizeAssessment(
      { ...baseRaw, clarity: { score: 999, rationale: "", suggestion: "" } },
      80,
    );
    expect(a.clarity.score).toBe(100);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const dyn = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "",
    suggestion: "",
  });

  const spec = (key: string): CriterionSpec => ({ key, label: key, bestPractice: key });

  it("deduplicates by key on first assessment (no prior)", () => {
    const input = [dyn("a", 70), dyn("a", 80), dyn("b", 60)];
    const result = normalizeDynamicCriteria(input, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 on first assessment", () => {
    const input = [dyn("a", 70), dyn("b", 60), dyn("c", 50), dyn("d", 40)];
    const result = normalizeDynamicCriteria(input, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior order and keys when prior is provided", () => {
    const prior = [spec("x"), spec("y"), spec("z")];
    const incoming = [dyn("z", 90), dyn("x", 70), dyn("y", 80)];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result.map((r) => r.key)).toEqual(["x", "y", "z"]);
    expect(result[0].score).toBe(70); // x
    expect(result[1].score).toBe(80); // y
    expect(result[2].score).toBe(90); // z
  });

  it("handles undefined/empty input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("falls back gracefully when incoming is missing a prior key", () => {
    const prior = [spec("a"), spec("b")];
    const incoming = [dyn("a", 70)]; // missing "b"
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(0); // default
  });
});
