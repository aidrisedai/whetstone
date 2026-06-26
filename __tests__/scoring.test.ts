import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "../lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "../lib/types";

describe("clamp", () => {
  it("clamps to 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-1)).toBe(0);
    expect(clamp(101)).toBe(100);
  });

  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });

  it("rounds to integer", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns mean of scores", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
    expect(computeOverall([100, 0])).toBe(50);
  });

  it("rounds to integer", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("isReady", () => {
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all above floor", () => {
    expect(isReady(80, [80, 80], 80)).toBe(true);
  });

  it("returns false when any dimension is below the floor (65)", () => {
    expect(isReady(85, [85, 64], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const assessment = {
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "l1", bestPractice: "bp1", score: 90, rationale: "", suggestion: "" },
      ],
    };
    expect(dimensionScores(assessment)).toEqual([80, 70, 90]);
  });

  it("clamps scores that are out of range", () => {
    const assessment = {
      clarity: { score: -5, rationale: "", suggestion: "" },
      conciseness: { score: 110, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    };
    expect(dimensionScores(assessment)).toEqual([0, 100]);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Game",
    clarity: { score: 85, rationale: "Good", suggestion: "Keep it up" },
    conciseness: { score: 75, rationale: "OK", suggestion: "Tighten" },
    dynamicCriteria: [
      { key: "mechanic", label: "Core mechanic", bestPractice: "bp", score: 80, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "Build a platformer",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 80) / 3));
  });

  it("marks ready when threshold and floor are met", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
  });

  it("marks not ready when overall is below threshold", () => {
    const lowRaw = { ...raw, clarity: { ...raw.clarity, score: 50 }, conciseness: { ...raw.conciseness, score: 50 } };
    const result = finalizeAssessment(lowRaw, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps dimension scores", () => {
    const unclamped = { ...raw, clarity: { ...raw.clarity, score: 150 } };
    const result = finalizeAssessment(unclamped, 80);
    expect(result.clarity.score).toBe(100);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("is 80 by default", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "mechanic", label: "Core mechanic", bestPractice: "bp1" },
    { key: "winstate", label: "Win state", bestPractice: "bp2" },
  ];

  const items: DynamicCriterion[] = [
    { key: "mechanic", label: "Core mechanic", bestPractice: "bp1", score: 80, rationale: "r1", suggestion: "s1" },
    { key: "winstate", label: "Win state", bestPractice: "bp2", score: 70, rationale: "r2", suggestion: "s2" },
  ];

  it("uses prior specs as the authority on key/label/bestPractice", () => {
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].label).toBe("Core mechanic");
    expect(result[1].label).toBe("Win state");
  });

  it("fills in scores from matching items", () => {
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].score).toBe(80);
    expect(result[1].score).toBe(70);
  });

  it("deduplicates by key on first assessment (no prior)", () => {
    const dupes: DynamicCriterion[] = [...items, { ...items[0] }];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result.length).toBe(2);
  });

  it("caps to 3 on first assessment", () => {
    const many: DynamicCriterion[] = [1, 2, 3, 4].map((n) => ({
      key: `k${n}`,
      label: `l${n}`,
      bestPractice: `bp${n}`,
      score: 70,
      rationale: "",
      suggestion: "",
    }));
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBe(3);
  });

  it("returns empty array for missing items and null prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
