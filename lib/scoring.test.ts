import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("keeps values in [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(-Infinity)).toBe(0);
  });

  it("clamps above 100", () => {
    expect(clamp(110)).toBe(100);
    expect(clamp(Infinity)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(74.6)).toBe(75);
    expect(clamp(74.4)).toBe(74);
  });

  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns the rounded mean", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 75, 80])).toBe(75);
  });

  it("rounds correctly (0.5 rounds up)", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 → 71
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles a single score", () => {
    expect(computeOverall([77])).toBe(77);
  });
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("is ready when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(85, [85, 90, 80], threshold)).toBe(true);
  });

  it("is not ready when overall is below threshold", () => {
    expect(isReady(79, [85, 90, 79], threshold)).toBe(false);
  });

  it("is not ready when any score is below the floor even if overall is high enough", () => {
    // DIMENSION_FLOOR is 65; one score at 64 should block export
    expect(isReady(82, [90, 90, 64], threshold)).toBe(false);
  });

  it("is not ready when the array is empty", () => {
    expect(isReady(85, [], threshold)).toBe(false);
  });

  it("is ready right at the threshold boundary", () => {
    expect(isReady(80, [80, 80, 80], threshold)).toBe(true);
    expect(isReady(79, [80, 80, 80], threshold)).toBe(false);
  });

  it("is ready right at the floor boundary", () => {
    expect(isReady(80, [80, 80, DIMENSION_FLOOR], threshold)).toBe(true);
    expect(isReady(80, [80, 80, DIMENSION_FLOOR - 1], threshold)).toBe(false);
  });
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores", () => {
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "a", score: 90, rationale: "", suggestion: "" },
        { key: "b", label: "B", bestPractice: "b", score: 60, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([80, 70, 90, 60]);
  });

  it("clamps out-of-range scores", () => {
    const result = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeItem = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates by key on first call (no prior)", () => {
    const items = [makeItem("a", 70), makeItem("a", 80), makeItem("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    // first occurrence of "a" wins; capped at 3
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 items on the first call", () => {
    const items = [makeItem("a", 70), makeItem("b", 60), makeItem("c", 50), makeItem("d", 40)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior criteria ordering and keys on subsequent calls", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "b" },
      { key: "a", label: "A", bestPractice: "a" },
    ];
    const items = [makeItem("a", 90), makeItem("b", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    // should be ordered: b first, then a
    expect(result[0].key).toBe("b");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(90);
    // labels come from prior
    expect(result[0].label).toBe("B");
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(null as unknown as [], null)).toEqual([]);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: { score: 85, rationale: "clear", suggestion: "ok" },
    conciseness: { score: 80, rationale: "tight", suggestion: "ok" },
    dynamicCriteria: [
      { key: "x", label: "X", bestPractice: "x", score: 90, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "Build a web app.",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const a = finalizeAssessment(raw, 80);
    // scores: 85, 80, 90 → mean = 85
    expect(a.overall).toBe(85);
  });

  it("sets ready=true when thresholds are met", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const a = finalizeAssessment({ ...raw, clarity: { ...raw.clarity, score: 40 } }, 80);
    expect(a.ready).toBe(false);
  });

  it("sets ready=false when a single dimension is below the floor (65)", () => {
    const a = finalizeAssessment({
      ...raw,
      dynamicCriteria: [
        { key: "x", label: "X", bestPractice: "x", score: 50, rationale: "r", suggestion: "s" },
      ],
    }, 80);
    // 85 + 80 + 50 = 215 / 3 ≈ 72 — overall passes but 50 < 65 floor
    expect(a.ready).toBe(false);
  });

  it("stamps the active threshold", () => {
    const a = finalizeAssessment(raw, 75);
    expect(a.threshold).toBe(75);
  });

  it("clamps out-of-range raw scores before computing overall", () => {
    const a = finalizeAssessment({
      ...raw,
      clarity: { score: 150, rationale: "", suggestion: "" },
    }, 80);
    expect(a.clarity.score).toBe(100);
  });

  it("uses DEFAULT_THRESHOLD when not supplied", () => {
    const a = finalizeAssessment(raw);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});
