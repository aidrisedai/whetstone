import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

describe("clamp", () => {
  it("keeps values within 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-10)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(150)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-numbers", () => {
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the sole score for a single element", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("averages multiple scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([60, 70, 80])).toBe(70);
  });

  it("rounds the result", () => {
    // (60 + 61) / 2 = 60.5 → rounds to 61
    expect(computeOverall([60, 61])).toBe(61);
  });
});

describe("isReady", () => {
  const threshold = 80;

  it("returns false for empty scores", () => {
    expect(isReady(85, [], threshold)).toBe(false);
  });

  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [70, 75, 80], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [70, 75, 80], threshold)).toBe(false);
  });

  it("returns false when any score is below the dimension floor", () => {
    expect(isReady(85, [64, 80, 90], threshold)).toBe(false);
  });

  it("passes right at the floor boundary", () => {
    expect(isReady(80, [DIMENSION_FLOOR, 80, 90], threshold)).toBe(true);
  });

  it("fails one point below the floor", () => {
    expect(isReady(80, [DIMENSION_FLOOR - 1, 80, 90], threshold)).toBe(false);
  });
});

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "game",
    clarity: makeDim(90),
    conciseness: makeDim(70),
    dynamicCriteria: [makeDynamic("creativity", 80)],
    refinedPrompt: "A cool game",
  };

  it("computes the correct overall mean", () => {
    const result = finalizeAssessment(raw, 80);
    // scores: [90, 70, 80] → mean = 80
    expect(result.overall).toBe(80);
  });

  it("marks ready when threshold is met and no dimension below floor", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
  });

  it("marks not ready when overall is below threshold", () => {
    const lowRaw = { ...raw, clarity: makeDim(50), conciseness: makeDim(50) };
    // scores: [50, 50, 80] → mean ≈ 60
    const result = finalizeAssessment(lowRaw, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const outRaw = { ...raw, clarity: makeDim(200), conciseness: makeDim(-5) };
    const result = finalizeAssessment(outRaw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold value", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const d1 = makeDynamic("originality", 70);
  const d2 = makeDynamic("scope", 80);
  const d3 = makeDynamic("impact", 90);

  it("deduplicates by key (first occurrence wins)", () => {
    const duped = [d1, { ...d1, score: 99 }, d2];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result.filter((d) => d.key === "originality")).toHaveLength(1);
    expect(result.find((d) => d.key === "originality")!.score).toBe(70);
  });

  it("caps to 3 on the first assessment (no prior)", () => {
    const many = [d1, d2, d3, makeDynamic("bonus", 60)];
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria order on subsequent assessments", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "bp" },
      { key: "originality", label: "Originality", bestPractice: "bp2" },
    ];
    const result = normalizeDynamicCriteria([d1, d2], prior);
    expect(result[0].key).toBe("scope");
    expect(result[1].key).toBe("originality");
  });

  it("uses prior label/bestPractice, not model's updated version", () => {
    const prior: CriterionSpec[] = [{ key: "scope", label: "Stable Label", bestPractice: "Stable BP" }];
    const fresh = [{ ...d2, label: "New Label", bestPractice: "New BP" }];
    const result = normalizeDynamicCriteria(fresh, prior);
    expect(result[0].label).toBe("Stable Label");
    expect(result[0].bestPractice).toBe("Stable BP");
  });

  it("returns empty array for undefined/null input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters out non-object items", () => {
    const bad = [null, undefined, d1] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(bad, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("originality");
  });
});
