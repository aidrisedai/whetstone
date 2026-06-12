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
} from "../lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "../lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes through values in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
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

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.6)).toBe(51);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-numbers", () => {
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 90])).toBe(85);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 rounds to 81
  });

  it("handles a single score", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("returns true when overall meets threshold and all dims above floor", () => {
    expect(isReady(80, [80, 90, 70], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 90, 70], threshold)).toBe(false);
  });

  it("returns false when any dim is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, 90, DIMENSION_FLOOR - 1], threshold)).toBe(false);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(80, [], threshold)).toBe(false);
  });

  it("exactly meeting the floor passes", () => {
    expect(isReady(80, [80, 80, DIMENSION_FLOOR], threshold)).toBe(true);
  });
});

// ── dimensionScores ────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns clamped scores for clarity, conciseness, and dynamic dims", () => {
    const scores = dimensionScores({
      clarity: { score: 85, rationale: "", suggestion: "" },
      conciseness: { score: 75, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "K1", bestPractice: "", score: 90, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([85, 75, 90]);
  });

  it("clamps out-of-range scores", () => {
    const scores = dimensionScores({
      clarity: { score: -5, rationale: "", suggestion: "" },
      conciseness: { score: 150, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([0, 100]);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const rawBase: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "App",
    clarity: { score: 85, rationale: "clear", suggestion: "" },
    conciseness: { score: 80, rationale: "concise", suggestion: "" },
    dynamicCriteria: [
      { key: "originality", label: "Originality", bestPractice: "", score: 78, rationale: "", suggestion: "" },
    ],
    refinedPrompt: "Build X",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(rawBase, 80);
    // mean(85, 80, 78) = 81
    expect(result.overall).toBe(81);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(rawBase, 80);
    expect(result.threshold).toBe(80);
  });

  it("sets ready=true when all conditions met", () => {
    const result = finalizeAssessment(rawBase, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall below threshold", () => {
    const result = finalizeAssessment(rawBase, 90); // higher threshold
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores in the result", () => {
    const raw = {
      ...rawBase,
      clarity: { score: 200, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(rawBase);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeItem = (key: string, score = 70): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: "",
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates by key, keeping first occurrence", () => {
    const items = [makeItem("a", 70), makeItem("a", 90), makeItem("b", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(70); // first occurrence kept
  });

  it("caps at 3 items on first assessment (no prior)", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d")];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria set when provided", () => {
    const prior: CriterionSpec[] = [
      { key: "originality", label: "Originality", bestPractice: "be original" },
      { key: "clarity", label: "Clarity", bestPractice: "be clear" },
    ];
    const items = [makeItem("originality", 88), makeItem("clarity", 92)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("originality");
    expect(result[0].score).toBe(88);
    expect(result[0].label).toBe("Originality"); // label from prior
    expect(result[1].key).toBe("clarity");
    expect(result[1].score).toBe(92);
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("falls back to positional match when key not found in current items", () => {
    const prior: CriterionSpec[] = [
      { key: "originality", label: "Originality", bestPractice: "" },
    ];
    // Model returns a different key entirely — falls back to index 0
    const items = [makeItem("something_else", 77)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("originality"); // locked to prior key
    expect(result[0].score).toBe(77); // score from positional fallback
  });
});
