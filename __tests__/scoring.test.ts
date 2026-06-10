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
import type { Assessment, DynamicCriterion, CriterionSpec } from "@/lib/types";

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------
describe("clamp", () => {
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-numbers", () => expect(clamp("hello" as unknown as number)).toBe(0));
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.6)).toBe(73));
  it("passes through valid range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// computeOverall
// ---------------------------------------------------------------------------
describe("computeOverall", () => {
  it("returns 0 for an empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores and rounds", () => expect(computeOverall([70, 80, 90])).toBe(80));
  it("rounds 0.5 up", () => expect(computeOverall([70, 71])).toBe(71));
  it("handles a single score", () => expect(computeOverall([42])).toBe(42));
});

// ---------------------------------------------------------------------------
// isReady
// ---------------------------------------------------------------------------
describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });
  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [90, 90, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
  it("returns true when every score is exactly at the floor and overall clears threshold", () => {
    expect(isReady(80, [DIMENSION_FLOOR, DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// dimensionScores
// ---------------------------------------------------------------------------
describe("dimensionScores", () => {
  it("returns clamped scores for clarity + conciseness + dynamic criteria", () => {
    const result = dimensionScores({
      clarity: { score: 75, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "L1", bestPractice: "bp", score: 150, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([75, 80, 100]);
  });
});

// ---------------------------------------------------------------------------
// finalizeAssessment
// ---------------------------------------------------------------------------
describe("finalizeAssessment", () => {
  function makeRaw(overrides?: Partial<Omit<Assessment, "overall" | "ready" | "threshold">>): Omit<
    Assessment,
    "overall" | "ready" | "threshold"
  > {
    return {
      projectType: "web app",
      clarity: { score: 80, rationale: "clear", suggestion: "" },
      conciseness: { score: 75, rationale: "concise", suggestion: "" },
      dynamicCriteria: [
        { key: "scope", label: "Scope", bestPractice: "bp", score: 70, rationale: "", suggestion: "" },
      ],
      refinedPrompt: "build a todo app",
      ...overrides,
    };
  }

  it("clamps all scores", () => {
    const result = finalizeAssessment(
      makeRaw({
        clarity: { score: 999, rationale: "", suggestion: "" },
        conciseness: { score: -5, rationale: "", suggestion: "" },
      }),
    );
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(makeRaw());
    expect(result.overall).toBe(Math.round((80 + 75 + 70) / 3));
  });

  it("marks ready=true when overall and all scores clear thresholds", () => {
    const result = finalizeAssessment(
      makeRaw({
        clarity: { score: 85, rationale: "", suggestion: "" },
        conciseness: { score: 80, rationale: "", suggestion: "" },
        dynamicCriteria: [
          { key: "scope", label: "Scope", bestPractice: "bp", score: 75, rationale: "", suggestion: "" },
        ],
      }),
      80,
    );
    expect(result.overall).toBe(80);
    expect(result.ready).toBe(true);
  });

  it("marks ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(makeRaw(), 90);
    expect(result.ready).toBe(false);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(makeRaw(), 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none supplied", () => {
    const result = finalizeAssessment(makeRaw());
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ---------------------------------------------------------------------------
// normalizeDynamicCriteria
// ---------------------------------------------------------------------------
describe("normalizeDynamicCriteria", () => {
  const makeCriterion = (key: string, score = 70): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: "bp",
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates by key (keeps first occurrence)", () => {
    const items = [makeCriterion("a", 70), makeCriterion("a", 80), makeCriterion("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((c) => c.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on the first assessment (no prior)", () => {
    const items = ["a", "b", "c", "d", "e"].map((k) => makeCriterion(k));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("returns an empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("locks to prior criteria when provided, updating scores", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "bp-scope" },
      { key: "users", label: "Users", bestPractice: "bp-users" },
    ];
    const items = [makeCriterion("scope", 85), makeCriterion("users", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[0].label).toBe("Scope");
    expect(result[0].bestPractice).toBe("bp-scope");
    expect(result[0].score).toBe(85);
    expect(result[1].score).toBe(90);
  });

  it("clamps scores coming from the model", () => {
    const prior: CriterionSpec[] = [{ key: "scope", label: "Scope", bestPractice: "bp" }];
    const items = [makeCriterion("scope", 200)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].score).toBe(100);
  });
});
