import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes a value already in range", () => expect(clamp(50)).toBe(50));
  it("floors at 0 for negatives", () => expect(clamp(-10)).toBe(0));
  it("ceil at 100 for values over 100", () => expect(clamp(110)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles boundary values 0 and 100", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns the mean of all scores", () => {
    expect(computeOverall([80, 60, 70])).toBe(70);
  });
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("handles a single score", () => {
    expect(computeOverall([85])).toBe(85);
  });
  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 rounds to 81
  });
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  const dyn = (score: number): DynamicCriterion => ({
    key: "k",
    label: "L",
    bestPractice: "bp",
    score,
    rationale: "",
    suggestion: "",
  });

  it("includes clarity and conciseness, plus dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [dyn(90)],
    });
    expect(scores).toEqual([80, 70, 90]);
  });

  it("clamps out-of-range values", () => {
    const scores = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(82, [80, 70, 85], 80)).toBe(true);
  });
  it("returns false when overall < threshold", () => {
    expect(isReady(79, [80, 70, 85], 80)).toBe(false);
  });
  it("returns false when any score < floor (65)", () => {
    expect(isReady(82, [80, 60, 85], 80)).toBe(false);
  });
  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
  it("respects a custom threshold", () => {
    expect(isReady(75, [70, 70, 70], 70)).toBe(true);
  });
  it("uses the DEFAULT_THRESHOLD constant correctly", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
  it("uses the DIMENSION_FLOOR constant correctly", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const dyn = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "",
    suggestion: "",
  });

  const base = {
    projectType: "Web app",
    clarity: { score: 82, rationale: "clear", suggestion: "s" },
    conciseness: { score: 78, rationale: "tight", suggestion: "s" },
    dynamicCriteria: [dyn("audience", 75), dyn("scope", 70)],
    refinedPrompt: "build something",
  };

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(base, 80);
    // (82 + 78 + 75 + 70) / 4 = 76.25 → 76
    expect(a.overall).toBe(76);
  });

  it("sets ready to false when overall is below threshold", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.ready).toBe(false);
  });

  it("sets ready to true when overall meets threshold and all scores >= floor", () => {
    const high = {
      ...base,
      clarity: { score: 85, rationale: "", suggestion: "" },
      conciseness: { score: 85, rationale: "", suggestion: "" },
      dynamicCriteria: [dyn("a", 80), dyn("b", 80)],
    };
    const a = finalizeAssessment(high, 80);
    expect(a.ready).toBe(true);
    expect(a.overall).toBe(83); // (85+85+80+80)/4 = 82.5 → 83
  });

  it("stamps the active threshold", () => {
    const a = finalizeAssessment(base, 75);
    expect(a.threshold).toBe(75);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const raw = {
      ...base,
      clarity: { score: 200, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
    };
    const a = finalizeAssessment(raw, 80);
    // clamped: 100, 0, 75, 70 → (100+0+75+70)/4 = 61.25 → 61
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
    expect(a.overall).toBe(61);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeDyn = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "",
    suggestion: "",
  });
  const makeSpec = (key: string): CriterionSpec => ({ key, label: key, bestPractice: key });

  it("deduplicates by key and caps at 3 on first assessment", () => {
    const items = [
      makeDyn("a", 80),
      makeDyn("b", 70),
      makeDyn("a", 60), // duplicate — first wins
      makeDyn("c", 75),
      makeDyn("d", 65), // 4th — gets dropped (cap)
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first occurrence wins
  });

  it("locks to prior criteria keys in order", () => {
    const prior: CriterionSpec[] = [makeSpec("b"), makeSpec("c")];
    const items = [makeDyn("a", 50), makeDyn("b", 90), makeDyn("c", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["b", "c"]);
    expect(result[0].score).toBe(90);
    expect(result[1].score).toBe(75);
  });

  it("falls back gracefully when a prior key has no match", () => {
    const prior: CriterionSpec[] = [makeSpec("x"), makeSpec("y")];
    const items = [makeDyn("a", 70)]; // "x" and "y" not present
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    // x has no match → falls back to items[0] (a); y has no match → items[1] (undefined)
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(70); // matched by index fallback
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
