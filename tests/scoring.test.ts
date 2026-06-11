import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";

const makeCriterion = (key: string, score: number) => ({
  key,
  label: key,
  bestPractice: "",
  score,
  rationale: "",
  suggestion: "",
});

const baseRaw = {
  projectType: "web app",
  refinedPrompt: "A todo app for teens",
  clarity: { score: 75, rationale: "clear", suggestion: "" },
  conciseness: { score: 80, rationale: "concise", suggestion: "" },
  dynamicCriteria: [makeCriterion("novelty", 70)],
};

describe("clamp", () => {
  it("passes values already within bounds", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(75.4)).toBe(75);
    expect(clamp(75.5)).toBe(76);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number input", () => {
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the value unchanged for a single score", () => {
    expect(computeOverall([80])).toBe(80);
  });

  it("returns the rounded mean of multiple scores", () => {
    expect(computeOverall([70, 80, 90])).toBe(80);
    expect(computeOverall([70, 71])).toBe(71); // 70.5 → 71
  });
});

describe("isReady", () => {
  it("returns false when scores array is empty", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });

  it("returns true when overall >= threshold and all scores >= DIMENSION_FLOOR", () => {
    const scores = [DIMENSION_FLOOR, DIMENSION_FLOOR + 10, 80];
    expect(isReady(80, scores, 80)).toBe(true);
  });

  it("returns false when overall is one below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any score is one below DIMENSION_FLOOR", () => {
    expect(isReady(90, [90, 90, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });

  it("returns true when scores exactly equal DIMENSION_FLOOR", () => {
    const floor = DIMENSION_FLOOR;
    expect(isReady(floor, [floor, floor, floor], floor)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  it("computes overall as the mean of all dimension scores", () => {
    // scores: [75, 80, 70] → 225 / 3 = 75
    const result = finalizeAssessment(baseRaw);
    expect(result.overall).toBe(75);
  });

  it("clamps out-of-range scores before averaging", () => {
    const raw = { ...baseRaw, clarity: { ...baseRaw.clarity, score: 200 } };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
  });

  it("sets ready=true when threshold is met and no floor violation", () => {
    const raw = {
      ...baseRaw,
      clarity: { ...baseRaw.clarity, score: 85 },
      conciseness: { ...baseRaw.conciseness, score: 85 },
      dynamicCriteria: [makeCriterion("novelty", 85)],
    };
    expect(finalizeAssessment(raw, 80).ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    expect(finalizeAssessment(baseRaw, 80).ready).toBe(false); // overall=75
  });

  it("stamps the supplied threshold onto the result", () => {
    expect(finalizeAssessment(baseRaw, 60).threshold).toBe(60);
  });

  it("does not mutate the raw input", () => {
    const clone = JSON.parse(JSON.stringify(baseRaw));
    finalizeAssessment(baseRaw);
    expect(baseRaw).toEqual(clone);
  });
});

describe("normalizeDynamicCriteria", () => {
  const two = [makeCriterion("novelty", 70), makeCriterion("feasibility", 60)];

  it("returns an empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("caps to 3 items on the first pass (no prior)", () => {
    const five = Array.from({ length: 5 }, (_, i) => makeCriterion(`k${i}`, 70));
    expect(normalizeDynamicCriteria(five, null)).toHaveLength(3);
  });

  it("deduplicates by key, keeping the first occurrence", () => {
    const duped = [...two, { ...two[0], score: 99 }];
    const result = normalizeDynamicCriteria(duped, null);
    const noveltyHits = result.filter((r) => r.key === "novelty");
    expect(noveltyHits).toHaveLength(1);
    expect(noveltyHits[0].score).toBe(70); // first occurrence wins
  });

  it("locks to prior spec order and pulls latest matching scores", () => {
    const prior = [
      { key: "feasibility", label: "Feasibility", bestPractice: "" },
      { key: "novelty", label: "Novelty", bestPractice: "" },
    ];
    const result = normalizeDynamicCriteria(two, prior);
    expect(result[0].key).toBe("feasibility");
    expect(result[0].score).toBe(60);
    expect(result[1].key).toBe("novelty");
    expect(result[1].score).toBe(70);
  });

  it("uses prior label and bestPractice (not the incoming ones)", () => {
    const prior = [{ key: "novelty", label: "Locked Label", bestPractice: "locked" }];
    const result = normalizeDynamicCriteria(two, prior);
    expect(result[0].label).toBe("Locked Label");
    expect(result[0].bestPractice).toBe("locked");
  });
});
