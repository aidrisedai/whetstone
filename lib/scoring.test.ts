import test from "node:test";
import assert from "node:assert/strict";
import {
  clamp,
  computeOverall,
  dimensionScores,
  DIMENSION_FLOOR,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "./scoring.ts";
import type { CriterionSpec, Dimension, DynamicCriterion } from "./types.ts";

function dim(score: number): Dimension {
  return { score, rationale: "r", suggestion: "s" };
}

function crit(key: string, score: number): DynamicCriterion {
  return { key, label: key, bestPractice: key, score, rationale: "r", suggestion: "s" };
}

test("clamp rounds and bounds to 0-100", () => {
  assert.equal(clamp(150), 100);
  assert.equal(clamp(-10), 0);
  assert.equal(clamp(50.6), 51);
  assert.equal(clamp(NaN), 0);
  assert.equal(clamp("nope" as unknown as number), 0);
});

test("dimensionScores clamps clarity, conciseness, and every dynamic criterion", () => {
  const scores = dimensionScores({
    clarity: dim(120),
    conciseness: dim(-5),
    dynamicCriteria: [crit("a", 70), crit("b", 200)],
  });
  assert.deepEqual(scores, [100, 0, 70, 100]);
});

test("computeOverall is the mean, rounded, and 0 for an empty list", () => {
  assert.equal(computeOverall([1, 2, 3]), 2);
  assert.equal(computeOverall([80, 81]), 81);
  assert.equal(computeOverall([]), 0);
});

test("isReady requires the overall to clear the threshold AND every score to clear the floor", () => {
  assert.equal(isReady(90, [90, 90], 80), true);
  assert.equal(isReady(90, [90, DIMENSION_FLOOR - 1], 80), false, "one weak dimension should block readiness");
  assert.equal(isReady(70, [90, 90], 80), false, "overall below threshold should block readiness");
  assert.equal(isReady(90, [], 80), false, "no scores can never be ready");
});

test("finalizeAssessment clamps every score and computes overall + ready deterministically", () => {
  const result = finalizeAssessment(
    {
      projectType: "Web app",
      clarity: dim(150),
      conciseness: dim(90),
      dynamicCriteria: [crit("define_audience", 90), crit("success_criteria", 90)],
      refinedPrompt: "Build it.",
    },
    80,
  );
  assert.equal(result.clarity.score, 100);
  assert.equal(result.overall, computeOverall([100, 90, 90, 90]));
  assert.equal(result.ready, true);
  assert.equal(result.threshold, 80);
});

test("finalizeAssessment is not ready when a dimension lags below the floor even if overall clears the threshold", () => {
  const result = finalizeAssessment(
    {
      projectType: "Web app",
      clarity: dim(100),
      conciseness: dim(100),
      dynamicCriteria: [crit("a", 100), crit("b", 40)],
      refinedPrompt: "Build it.",
    },
    80,
  );
  assert.equal(result.overall, 85);
  assert.equal(result.ready, false);
});

test("normalizeDynamicCriteria dedupes by key and caps to 3 when there is no prior spec", () => {
  const items = [crit("a", 10), crit("a", 20), crit("b", 30), crit("c", 40), crit("d", 50)];
  const result = normalizeDynamicCriteria(items, null);
  assert.deepEqual(
    result.map((r) => r.key),
    ["a", "b", "c"],
  );
  assert.equal(result[0].score, 10, "first occurrence of a duplicate key wins");
});

test("normalizeDynamicCriteria filters out malformed entries with no string key", () => {
  const items = [crit("a", 10), null as unknown as DynamicCriterion, { score: 5 } as unknown as DynamicCriterion];
  const result = normalizeDynamicCriteria(items, null);
  assert.deepEqual(
    result.map((r) => r.key),
    ["a"],
  );
});

test("normalizeDynamicCriteria locks to the prior spec's keys, in order, once one is established", () => {
  const prior: CriterionSpec[] = [
    { key: "b", label: "B", bestPractice: "b" },
    { key: "a", label: "A", bestPractice: "a" },
  ];
  const items = [crit("a", 55), crit("b", 66)];
  const result = normalizeDynamicCriteria(items, prior);
  assert.deepEqual(
    result.map((r) => r.key),
    ["b", "a"],
  );
  assert.equal(result[0].score, 66);
  assert.equal(result[1].score, 55);
});

test("normalizeDynamicCriteria falls back to 0/empty text for a prior key the model dropped", () => {
  const prior: CriterionSpec[] = [{ key: "missing", label: "Missing", bestPractice: "missing" }];
  const result = normalizeDynamicCriteria([], prior);
  assert.equal(result.length, 1);
  assert.equal(result[0].score, 0);
  assert.equal(result[0].rationale, "");
});
