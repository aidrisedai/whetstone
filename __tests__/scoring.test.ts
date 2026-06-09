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
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

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
  it("clamps values to 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(50.6)).toBe(51); // rounds
  });

  it("handles non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores rounded", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([70, 75, 65])).toBe(70);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("returns fixed + dynamic scores clamped", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(90),
      dynamicCriteria: [dyn("a", 70), dyn("b", 60)],
    });
    expect(scores).toEqual([80, 90, 70, 60]);
  });

  it("clamps out-of-range model scores", () => {
    const scores = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns true when overall ≥ threshold AND all dims ≥ floor", () => {
    expect(isReady(80, [80, 70, 65], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 65], 80)).toBe(false);
  });

  it("returns false when any dimension is below floor (65)", () => {
    expect(isReady(85, [90, 64, 80], 80)).toBe(false);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("defaults to 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: dim(85),
    conciseness: dim(78),
    dynamicCriteria: [dyn("define_audience", 72)],
    refinedPrompt: "Build something.",
  };

  it("computes overall as mean and sets ready correctly", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(Math.round((85 + 78 + 72) / 3));
    expect(a.threshold).toBe(80);
    // overall = 78, not ready
    expect(a.ready).toBe(false);
  });

  it("sets ready=true when scores pass the gate", () => {
    const highRaw = {
      ...raw,
      clarity: dim(85),
      conciseness: dim(82),
      dynamicCriteria: [dyn("define_audience", 80)],
    };
    const a = finalizeAssessment(highRaw, 80);
    expect(a.ready).toBe(true);
  });

  it("stamps the active threshold", () => {
    const a = finalizeAssessment(raw, 75);
    expect(a.threshold).toBe(75);
  });

  it("clamps out-of-range model scores", () => {
    const a = finalizeAssessment({ ...raw, clarity: dim(999) });
    expect(a.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dyn("a", 70),
    dyn("b", 60),
    dyn("a", 80), // duplicate key
  ];

  it("deduplicates by key (first occurrence wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first "a" kept
  });

  it("caps to 3 on first assessment", () => {
    const many = [dyn("a", 1), dyn("b", 2), dyn("c", 3), dyn("d", 4)];
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria set and only updates scores", () => {
    const prior = [
      { key: "a", label: "A label", bestPractice: "be_clear" },
      { key: "b", label: "B label", bestPractice: "define_audience" },
    ];
    const fresh: DynamicCriterion[] = [dyn("a", 90), dyn("b", 85)];
    const result = normalizeDynamicCriteria(fresh, prior);
    expect(result[0].key).toBe("a");
    expect(result[0].label).toBe("A label"); // locked from prior
    expect(result[0].score).toBe(90); // updated
    expect(result[1].score).toBe(85);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(null as unknown as undefined, null)).toEqual([]);
  });
});
