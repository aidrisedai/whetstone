import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../lib/scoring";
import type { DynamicCriterion } from "../lib/types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("rounds and clamps in-range values", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-Infinity)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(Infinity)).toBe(100);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number", () => {
    expect(clamp("hello" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("averages an array of scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
  });

  it("rounds the result", () => {
    expect(computeOverall([67, 68])).toBe(68); // 67.5 rounds to 68
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles a single score", () => {
    expect(computeOverall([73])).toBe(73);
  });
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 80, 80], threshold)).toBe(true);
    expect(isReady(95, [70, 90, 85], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], threshold)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [80, DIMENSION_FLOOR - 1, 90], threshold)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns clamped scores for clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: { score: 75, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "L1", bestPractice: "", score: 90, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([75, 80, 90]);
  });

  it("clamps out-of-range values in dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: { score: -5, rationale: "", suggestion: "" },
      conciseness: { score: 110, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([0, 100]);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "web app",
    refinedPrompt: "A simple to-do list for teens",
    clarity: { score: 85, rationale: "Clear", suggestion: "" },
    conciseness: { score: 75, rationale: "Good", suggestion: "" },
    dynamicCriteria: [] as DynamicCriterion[],
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(80); // (85 + 75) / 2 = 80
  });

  it("sets ready=true when threshold is met and all scores clear the floor", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const raw = { ...baseRaw, clarity: { ...baseRaw.clarity, score: 60 } };
    const result = finalizeAssessment(raw, 80); // overall = (60+75)/2 = 67.5 → 68
    expect(result.ready).toBe(false);
  });

  it("clamps raw scores that exceed 100", () => {
    const raw = { ...baseRaw, clarity: { ...baseRaw.clarity, score: 150 } };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none is provided", () => {
    const result = finalizeAssessment(baseRaw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const crit = (key: string, score: number): DynamicCriterion => ({
    key,
    label: `Label ${key}`,
    bestPractice: "",
    score,
    rationale: "",
    suggestion: "",
  });

  it("dedupes by key on first assessment (no prior)", () => {
    const items = [crit("a", 70), crit("a", 90), crit("b", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 on first assessment", () => {
    const items = [crit("a", 70), crit("b", 80), crit("c", 90), crit("d", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior keys when prior is set", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "" },
      { key: "b", label: "B", bestPractice: "" },
    ];
    const items = [crit("a", 85), crit("b", 70), crit("c", 60)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(85);
  });

  it("returns empty array when items is undefined and no prior", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("uses prior label/bestPractice when locking to prior set", () => {
    const prior = [{ key: "originality", label: "Originality", bestPractice: "Be bold" }];
    const items = [crit("originality", 88)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Originality");
    expect(result[0].bestPractice).toBe("Be bold");
  });
});

// ── isReady — export gate invariant ─────────────────────────────────────────

describe("export gate invariant", () => {
  it("a single weak dimension blocks export even with a high average", () => {
    // Overall would be (95+95+30)/3 ≈ 73 — below default threshold anyway,
    // but also the floor check catches the 30.
    expect(isReady(73, [95, 95, 30], 70)).toBe(false);
  });

  it("all dimensions at exactly the floor + overall at threshold → ready", () => {
    const floor = DIMENSION_FLOOR;
    const scores = [floor, floor, floor];
    const overall = computeOverall(scores);
    expect(isReady(overall, scores, floor)).toBe(true);
  });
});
