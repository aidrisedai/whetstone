import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  DIMENSION_FLOOR,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
} from "../lib/scoring";

describe("clamp", () => {
  it("clamps values above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("clamps values below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("rounds to nearest integer", () => expect(clamp(75.6)).toBe(76));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("foo" as unknown as number)).toBe(0));
  it("passes 0 through", () => expect(clamp(0)).toBe(0));
  it("passes 100 through", () => expect(clamp(100)).toBe(100));
  it("passes mid-range values through", () => expect(clamp(75)).toBe(75));
});

describe("computeOverall", () => {
  it("averages an even set of scores", () => expect(computeOverall([80, 60])).toBe(70));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds the average", () => expect(computeOverall([80, 79])).toBe(80));
  it("handles a single score", () => expect(computeOverall([75])).toBe(75));
  it("handles all zeros", () => expect(computeOverall([0, 0, 0])).toBe(0));
  it("handles all 100s", () => expect(computeOverall([100, 100])).toBe(100));
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 70, DIMENSION_FLOOR], 80)).toBe(true);
  });
  it("returns false when overall < threshold", () => {
    expect(isReady(79, [80, 70, DIMENSION_FLOOR], 80)).toBe(false);
  });
  it("returns false when any score is below the floor", () => {
    expect(isReady(85, [90, DIMENSION_FLOOR - 1, 80], 80)).toBe(false);
  });
  it("returns false for an empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
  it("returns true exactly at threshold + floor boundary", () => {
    expect(isReady(80, [80, 65, 65], 80)).toBe(true);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and all dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "feasibility", label: "Feasibility", bestPractice: "", score: 65, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([80, 70, 65]);
  });

  it("clamps scores that exceed 100", () => {
    const scores = dimensionScores({
      clarity: { score: 120, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores[0]).toBe(100);
  });
});

const baseRaw = {
  projectType: "app",
  clarity: { score: 80, rationale: "clear", suggestion: "" },
  conciseness: { score: 75, rationale: "concise", suggestion: "" },
  dynamicCriteria: [
    { key: "feasibility", label: "Feasibility", bestPractice: "", score: 70, rationale: "", suggestion: "" },
  ],
  refinedPrompt: "Build a teen fitness tracker with streak rewards.",
};

describe("finalizeAssessment", () => {
  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(Math.round((80 + 75 + 70) / 3));
  });

  it("sets ready=false when overall falls below threshold", () => {
    const result = finalizeAssessment(baseRaw, 90);
    expect(result.ready).toBe(false);
  });

  it("stamps the active threshold on the result", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const raw = { ...baseRaw, clarity: { ...baseRaw.clarity, score: 150 } };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
  });

  it("preserves non-score fields from the raw input", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.refinedPrompt).toBe(baseRaw.refinedPrompt);
    expect(result.projectType).toBe(baseRaw.projectType);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items = [
    { key: "feasibility", label: "Feasibility", bestPractice: "bp1", score: 70, rationale: "ok", suggestion: "improve" },
    { key: "market", label: "Market", bestPractice: "bp2", score: 80, rationale: "large", suggestion: "" },
  ];

  it("deduplicates items with the same key", () => {
    const duped = [...items, items[0]];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result.length).toBe(2);
  });

  it("caps the list to 3 items when no prior spec is provided", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`, label: `L${i}`, bestPractice: "", score: 70, rationale: "", suggestion: "",
    }));
    expect(normalizeDynamicCriteria(many, null).length).toBe(3);
  });

  it("locks output to prior spec order when prior is provided", () => {
    const prior = [
      { key: "market", label: "Market", bestPractice: "bp2" },
      { key: "feasibility", label: "Feasibility", bestPractice: "bp1" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["market", "feasibility"]);
  });

  it("uses prior label and bestPractice, not the model's", () => {
    const prior = [{ key: "feasibility", label: "Locked Label", bestPractice: "Locked BP" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Locked Label");
    expect(result[0].bestPractice).toBe("Locked BP");
  });

  it("returns an empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("returns an empty array for empty input with no prior", () => {
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
