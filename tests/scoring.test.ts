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

const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "good",
  score,
  rationale: "ok",
  suggestion: "",
});

const rawAssessment = (): Omit<Assessment, "overall" | "ready" | "threshold"> => ({
  projectType: "App",
  clarity: { score: 80, rationale: "clear", suggestion: "" },
  conciseness: { score: 70, rationale: "concise", suggestion: "" },
  dynamicCriteria: [dyn("originality", 90)],
  refinedPrompt: "Build a quiz app",
});

describe("clamp", () => {
  it("clamps negative numbers to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(105)).toBe(100));
  it("rounds decimals", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through values in range", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("averages scores correctly", () => expect(computeOverall([80, 60, 100])).toBe(80));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("handles single score", () => expect(computeOverall([72])).toBe(72));
});

describe("dimensionScores", () => {
  it("returns all dimension scores including dynamic", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 60, rationale: "", suggestion: "" },
      dynamicCriteria: [dyn("a", 90), dyn("b", 70)],
    });
    expect(scores).toEqual([80, 60, 90, 70]);
  });

  it("clamps out-of-range scores", () => {
    const scores = dimensionScores({
      clarity: { score: 110, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(85, [80, 70, 90], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [80, 70, 90], 80)).toBe(false);
  });

  it("returns false when any score is below dimension floor", () => {
    expect(isReady(85, [80, 60, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });

  it("uses DIMENSION_FLOOR = 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
    expect(isReady(85, [65, 90], 80)).toBe(true);
    expect(isReady(85, [64, 90], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(rawAssessment(), 80);
    // clarity=80, conciseness=70, originality=90 → mean=80
    expect(result.overall).toBe(80);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(rawAssessment(), 75);
    expect(result.threshold).toBe(75);
  });

  it("sets ready=true when overall >= threshold and all scores >= floor", () => {
    const result = finalizeAssessment(rawAssessment(), 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(rawAssessment(), 90);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const raw = rawAssessment();
    raw.clarity.score = 150;
    raw.conciseness.score = -10;
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key (first wins)", () => {
    const items = [dyn("a", 80), dyn("a", 90), dyn("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = [dyn("a", 80), dyn("b", 70), dyn("c", 90), dyn("d", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior criteria set in subsequent assessments", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "A", bestPractice: "good" },
      { key: "b", label: "B", bestPractice: "good" },
    ];
    const items = [dyn("a", 85), dyn("b", 75), dyn("c", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.length).toBe(2);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
