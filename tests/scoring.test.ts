import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynCrit = (key: string, score: number) => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through in-range values", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores correctly", () => expect(computeOverall([80, 90, 70])).toBe(80));
  it("rounds the result", () => expect(computeOverall([75, 76])).toBe(76));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(90),
      dynamicCriteria: [dynCrit("impact", 70)],
    });
    expect(scores).toEqual([80, 90, 70]);
  });

  it("clamps out-of-range scores in all dimensions", () => {
    const scores = dimensionScores({
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [dynCrit("feasibility", 200)],
    });
    expect(scores).toEqual([100, 0, 100]);
  });
});

describe("isReady", () => {
  it("returns false when overall below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [90, 64, 90], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 70, 90], 80)).toBe(true);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    summary: "Good idea",
    clarity: dim(85),
    conciseness: dim(90),
    dynamicCriteria: [dynCrit("feasibility", 75), dynCrit("impact", 80)],
  };

  it("computes correct overall", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(Math.round((85 + 90 + 75 + 80) / 4));
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(raw, 75);
    expect(a.threshold).toBe(75);
  });

  it("marks ready when threshold met and floor cleared", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.ready).toBe(a.overall >= 80 && Math.min(85, 90, 75, 80) >= DIMENSION_FLOOR);
  });

  it("clamps out-of-range scores in the raw input", () => {
    const outRaw = { ...raw, clarity: dim(150), conciseness: dim(-10) };
    const a = finalizeAssessment(outRaw);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items = [dynCrit("feasibility", 80), dynCrit("impact", 70), dynCrit("feasibility", 90)];

  it("deduplicates by key (keeps first occurrence)", () => {
    const result = normalizeDynamicCriteria(items, null);
    const keys = result.map((r) => r.key);
    expect(keys.filter((k) => k === "feasibility").length).toBe(1);
  });

  it("caps to 3 items when no prior criteria", () => {
    const many = Array.from({ length: 5 }, (_, i) => dynCrit(`key${i}`, 70));
    expect(normalizeDynamicCriteria(many, null).length).toBe(3);
  });

  it("locks to prior criteria order when prior is provided", () => {
    const prior = [
      { key: "impact", label: "Impact", bestPractice: "bp" },
      { key: "feasibility", label: "Feasibility", bestPractice: "bp" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["impact", "feasibility"]);
  });

  it("handles undefined input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
