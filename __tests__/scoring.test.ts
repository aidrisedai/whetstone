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

// --- clamp ---

describe("clamp", () => {
  it("rounds and clamps to [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(150)).toBe(100);
    expect(clamp(-10)).toBe(0);
    expect(clamp(72.6)).toBe(73);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("string" as unknown as number)).toBe(0);
  });
});

// --- computeOverall ---

describe("computeOverall", () => {
  it("averages an array of scores", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([0, 100])).toBe(50);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the mean", () => {
    expect(computeOverall([70, 71])).toBe(71);
  });
});

// --- isReady ---

describe("isReady", () => {
  const threshold = 80;

  it("returns true when overall meets threshold and all scores meet floor", () => {
    expect(isReady(80, [80, 70, 70], threshold)).toBe(true);
    expect(isReady(95, [90, 80, 75], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [90, 90, 90], threshold)).toBe(false);
  });

  it("returns false when any dimension is below the floor", () => {
    expect(isReady(85, [90, 90, 64], threshold)).toBe(false);
    expect(isReady(85, [64, 90, 90], threshold)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });
});

// --- finalizeAssessment ---

describe("finalizeAssessment", () => {
  const base = {
    projectType: "web-app",
    clarity: { score: 78, rationale: "clear", suggestion: "" },
    conciseness: { score: 82, rationale: "concise", suggestion: "" },
    dynamicCriteria: [
      { key: "feasibility", label: "Feasibility", bestPractice: "", score: 90, rationale: "", suggestion: "" },
    ],
    refinedPrompt: "Build an app",
  };

  it("clamps scores and computes overall", () => {
    const result = finalizeAssessment(base);
    expect(result.overall).toBe(Math.round((78 + 82 + 90) / 3));
    expect(result.clarity.score).toBe(78);
    expect(result.conciseness.score).toBe(82);
  });

  it("sets ready=true when threshold and floor are both met", () => {
    const high = {
      ...base,
      clarity: { ...base.clarity, score: 85 },
      conciseness: { ...base.conciseness, score: 85 },
      dynamicCriteria: [{ ...base.dynamicCriteria[0], score: 85 }],
    };
    const result = finalizeAssessment(high, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when any dimension is below the floor", () => {
    const low = {
      ...base,
      clarity: { ...base.clarity, score: 60 },
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const wild = {
      ...base,
      clarity: { ...base.clarity, score: 150 },
      conciseness: { ...base.conciseness, score: -5 },
    };
    const result = finalizeAssessment(wild);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });
});

// --- normalizeDynamicCriteria ---

describe("normalizeDynamicCriteria", () => {
  const makeItem = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: "",
    score,
    rationale: "",
    suggestion: "",
  });

  const makeSpec = (key: string): CriterionSpec => ({
    key,
    label: key,
    bestPractice: "",
  });

  it("caps first-assessment to 3 items", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeItem(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const items = [makeItem("a", 70), makeItem("a", 80), makeItem("b", 90)];
    const result = normalizeDynamicCriteria(items, null);
    const keys = result.map((r) => r.key);
    expect(keys.filter((k) => k === "a")).toHaveLength(1);
  });

  it("locks to prior criteria when provided", () => {
    const prior = [makeSpec("feasibility"), makeSpec("scope")];
    const items = [makeItem("feasibility", 75), makeItem("scope", 85), makeItem("extra", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("feasibility");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(85);
  });

  it("defaults missing prior keys to score 0", () => {
    const prior = [makeSpec("feasibility"), makeSpec("scope")];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].score).toBe(0);
    expect(result[1].score).toBe(0);
  });

  it("handles undefined input gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("preserves prior labels and bestPractice (not model-overridden)", () => {
    const prior = [{ key: "a", label: "Locked Label", bestPractice: "Do this" }];
    const items = [{ key: "a", label: "Different Label", bestPractice: "other", score: 70, rationale: "r", suggestion: "s" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Locked Label");
    expect(result[0].bestPractice).toBe("Do this");
  });
});

// --- Constants ---

describe("constants", () => {
  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });

  it("DEFAULT_THRESHOLD defaults to 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});
