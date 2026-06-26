import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring.ts";
import type { DynamicCriterion, CriterionSpec } from "../lib/types.ts";

describe("clamp", () => {
  it("clamps values above 100 to 100", () => assert.equal(clamp(150), 100));
  it("clamps values below 0 to 0", () => assert.equal(clamp(-10), 0));
  it("returns 0 for NaN", () => assert.equal(clamp(NaN), 0));
  it("returns 0 for non-number", () => assert.equal(clamp("foo" as unknown as number), 0));
  it("rounds fractional scores", () => assert.equal(clamp(72.6), 73));
  it("keeps in-range values intact", () => assert.equal(clamp(75), 75));
  it("keeps boundary 0", () => assert.equal(clamp(0), 0));
  it("keeps boundary 100", () => assert.equal(clamp(100), 100));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => assert.equal(computeOverall([]), 0));
  it("averages evenly", () => assert.equal(computeOverall([80, 90, 70]), 80));
  it("rounds the average", () => assert.equal(computeOverall([81, 82]), 82));
  it("handles single value", () => assert.equal(computeOverall([77]), 77));
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all dims clear floor", () =>
    assert.equal(isReady(85, [80, 90, 70], 80), true));
  it("returns false when overall is below threshold", () =>
    assert.equal(isReady(79, [80, 90, 70], 80), false));
  it("returns false when a dim is below the floor", () =>
    assert.equal(isReady(85, [85, 90, 60], 80), false));
  it("returns false for empty scores", () =>
    assert.equal(isReady(90, [], 80), false));
  it("passes when all dims are exactly at floor", () =>
    assert.equal(isReady(80, [65, 65, 65], 80), true));
  it(`uses DIMENSION_FLOOR constant (${DIMENSION_FLOOR})`, () =>
    assert.equal(isReady(80, [DIMENSION_FLOOR - 1, 80, 80], 80), false));
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "game",
    clarity: { score: 85, rationale: "clear", suggestion: "good" },
    conciseness: { score: 90, rationale: "brief", suggestion: "solid" },
    dynamicCriteria: [
      { key: "scope", label: "Scope", bestPractice: "narrow", score: 78, rationale: "ok", suggestion: "narrow it" },
    ],
    refinedPrompt: "Build a game",
  };

  it("computes overall as mean of all dims", () => {
    const result = finalizeAssessment(base, 80);
    assert.equal(result.overall, computeOverall([85, 90, 78]));
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 80);
    assert.equal(result.threshold, 80);
  });

  it("marks ready=true when threshold met", () => {
    const result = finalizeAssessment(base, 80);
    assert.equal(result.ready, true);
  });

  it("marks ready=false when threshold not met", () => {
    const result = finalizeAssessment({ ...base, clarity: { ...base.clarity, score: 50 } }, 80);
    assert.equal(result.ready, false);
  });

  it("clamps out-of-range dim scores", () => {
    const result = finalizeAssessment(
      { ...base, clarity: { ...base.clarity, score: 150 } },
      80,
    );
    assert.equal(result.clarity.score, 100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "a", label: "A", bestPractice: "bp-a", score: 80, rationale: "r", suggestion: "s" },
    { key: "b", label: "B", bestPractice: "bp-b", score: 70, rationale: "r2", suggestion: "s2" },
    { key: "a", label: "A-dup", bestPractice: "bp-a2", score: 90, rationale: "dup", suggestion: "dup" },
  ];

  it("deduplicates by key, keeping first occurrence", () => {
    const result = normalizeDynamicCriteria(items, null);
    assert.equal(result.length, 2);
    assert.equal(result[0].key, "a");
    assert.equal(result[1].key, "b");
  });

  it("caps to 3 items on first assessment", () => {
    const many: DynamicCriterion[] = Array.from({ length: 6 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: "bp",
      score: 70,
      rationale: "",
      suggestion: "",
    }));
    assert.equal(normalizeDynamicCriteria(many, null).length, 3);
  });

  it("locks to prior spec order when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp-b" },
      { key: "a", label: "A", bestPractice: "bp-a" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    assert.equal(result[0].key, "b");
    assert.equal(result[1].key, "a");
  });

  it("handles undefined/null input gracefully", () => {
    assert.deepEqual(normalizeDynamicCriteria(undefined, null), []);
  });

  it("clamps scores when prior is set", () => {
    const bad: DynamicCriterion[] = [
      { key: "x", label: "X", bestPractice: "bp", score: 999, rationale: "", suggestion: "" },
    ];
    const prior: CriterionSpec[] = [{ key: "x", label: "X", bestPractice: "bp" }];
    // clamping only happens in the prior branch; raw pass goes through unclamped
    // (dimensionScores clamps downstream)
    const result = normalizeDynamicCriteria(bad, prior);
    assert.equal(result[0].score, 100);
  });

  it("passes raw scores through when prior is null (clamped downstream)", () => {
    const raw: DynamicCriterion[] = [
      { key: "x", label: "X", bestPractice: "bp", score: 999, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(raw, null);
    assert.equal(result[0].score, 999);
  });
});
