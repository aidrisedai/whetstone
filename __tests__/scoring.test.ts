import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

describe("clamp", () => {
  it("keeps values in [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("rounds to integer", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
    expect(computeOverall([100, 0])).toBe(50);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 rounds up
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all dimensions clear the floor", () => {
    expect(isReady(80, [80, 75, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 75, 70], 80)).toBe(false);
  });

  it("returns false when a dimension is below the floor (65)", () => {
    expect(isReady(80, [80, 75, 64], 80)).toBe(false);
  });

  it("returns false for an empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(69, [70, 70, 70], 70)).toBe(false);
  });

  it("floor is 65 — exactly 65 passes", () => {
    expect(isReady(80, [80, 65], 80)).toBe(true);
    expect(isReady(80, [80, 64], 80)).toBe(false);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("defaults to 80 when env var is unset", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});

const makeDim = (score: number) => ({
  score,
  rationale: "test",
  suggestion: "test",
});

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "test",
  suggestion: "test",
});

describe("finalizeAssessment", () => {
  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: makeDim(80),
      conciseness: makeDim(90),
      dynamicCriteria: [makeDynamic("audience", 70)],
      refinedPrompt: "Build something",
    });
    expect(result.overall).toBe(80); // (80+90+70)/3
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(
      {
        projectType: "Game",
        clarity: makeDim(90),
        conciseness: makeDim(90),
        dynamicCriteria: [makeDynamic("mechanic", 90)],
        refinedPrompt: "Build a game",
      },
      75,
    );
    expect(result.threshold).toBe(75);
    expect(result.ready).toBe(true);
  });

  it("clamps out-of-range scores before computing", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: makeDim(200), // will be clamped to 100
      conciseness: makeDim(-10), // will be clamped to 0
      dynamicCriteria: [],
      refinedPrompt: "x",
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(50);
  });

  it("sets ready=false when not meeting threshold", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: makeDim(50),
      conciseness: makeDim(50),
      dynamicCriteria: [],
      refinedPrompt: "x",
    });
    expect(result.ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    makeDynamic("audience", 70),
    makeDynamic("scope", 80),
    makeDynamic("success", 75),
    makeDynamic("extra", 60),
  ];

  it("caps to 3 on the first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
    expect(result[0].key).toBe("audience");
    expect(result[1].key).toBe("scope");
    expect(result[2].key).toBe("success");
  });

  it("deduplicates by key", () => {
    const dupes: DynamicCriterion[] = [
      makeDynamic("audience", 70),
      makeDynamic("audience", 90), // duplicate — first wins
      makeDynamic("scope", 80),
    ];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(70); // first occurrence kept
  });

  it("locks to prior criteria set in order, pulling latest scores", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "audience" },
      { key: "scope", label: "Scope", bestPractice: "scope" },
    ];
    const updated: DynamicCriterion[] = [
      { ...makeDynamic("audience", 85), label: "Audience" },
      { ...makeDynamic("scope", 90), label: "Scope" },
    ];
    const result = normalizeDynamicCriteria(updated, prior);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(85);
    expect(result[1].score).toBe(90);
    // Labels come from prior, not the model
    expect(result[0].label).toBe("Audience");
  });

  it("returns empty array for undefined input with no prior", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toHaveLength(0);
  });

  it("filters out invalid items", () => {
    const bad = [null, { score: 70 }, makeDynamic("ok", 70)] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(bad, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("ok");
  });
});
