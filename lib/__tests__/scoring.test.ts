import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../scoring";

describe("clamp", () => {
  it("clamps values below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps values above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.4)).toBe(72));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-numbers", () =>
    expect(clamp("foo" as unknown as number)).toBe(0));
  it("passes through valid integer scores", () => expect(clamp(75)).toBe(75));
  it("clamps 0 to 0", () => expect(clamp(0)).toBe(0));
  it("clamps 100 to 100", () => expect(clamp(100)).toBe(100));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value unchanged", () =>
    expect(computeOverall([80])).toBe(80));
  it("averages two scores", () => expect(computeOverall([80, 60])).toBe(70));
  it("rounds fractional averages", () =>
    expect(computeOverall([80, 61])).toBe(71));
  it("handles all-zero scores", () =>
    expect(computeOverall([0, 0, 0])).toBe(0));
  it("handles all-hundred scores", () =>
    expect(computeOverall([100, 100])).toBe(100));
});

describe("isReady", () => {
  it("returns false for empty scores", () =>
    expect(isReady(80, [], 80)).toBe(false));
  it("returns true when overall >= threshold and all scores >= floor", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR, 75], 80)).toBe(true));
  it("returns false when overall < threshold", () =>
    expect(isReady(79, [80, 70, 75], 80)).toBe(false));
  it("returns false when any score is below the floor", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR - 1, 75], 80)).toBe(false));
  it("respects a custom threshold", () => {
    expect(isReady(90, [90, 90], 90)).toBe(true);
    expect(isReady(89, [90, 90], 90)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    clarity: { score: 75.7, rationale: "clear", suggestion: "be clearer" },
    conciseness: { score: 60, rationale: "ok", suggestion: "tighten" },
    dynamicCriteria: [
      {
        key: "core_mechanic",
        label: "Core Mechanic",
        bestPractice: "define it",
        score: 80,
        rationale: "good",
        suggestion: "none",
      },
    ],
    refinedPrompt: "test prompt",
    projectType: "app",
  };

  it("clamps and rounds dimension scores", () => {
    const result = finalizeAssessment(baseRaw);
    expect(result.clarity.score).toBe(76); // rounds 75.7
    expect(result.conciseness.score).toBe(60);
  });

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(baseRaw);
    // clarity=76, conciseness=60, core_mechanic=80 → mean=72
    expect(result.overall).toBe(72);
  });

  it("sets ready=false when below threshold", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(false);
  });

  it("sets ready=true when all conditions are met", () => {
    const highRaw = {
      clarity: { score: 85, rationale: "", suggestion: "" },
      conciseness: { score: 85, rationale: "", suggestion: "" },
      dynamicCriteria: [
        {
          key: "k1",
          label: "L1",
          bestPractice: "b",
          score: 85,
          rationale: "",
          suggestion: "",
        },
      ],
      refinedPrompt: "",
      projectType: "game",
    };
    const result = finalizeAssessment(highRaw, 80);
    expect(result.ready).toBe(true);
    expect(result.overall).toBe(85);
  });

  it("stamps the active threshold onto the assessment", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps an out-of-range score from the model", () => {
    const raw = {
      ...baseRaw,
      clarity: { score: 120, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items = [
    {
      key: "a",
      label: "A",
      bestPractice: "bp",
      score: 70,
      rationale: "r",
      suggestion: "s",
    },
    {
      key: "b",
      label: "B",
      bestPractice: "bp",
      score: 80,
      rationale: "r",
      suggestion: "s",
    },
    {
      key: "a",
      label: "A-dup",
      bestPractice: "bp",
      score: 90,
      rationale: "dup",
      suggestion: "s",
    },
  ];

  it("deduplicates by key — first occurrence wins", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 when no prior is set", () => {
    const many = ["a", "b", "c", "d", "e"].map((k) => ({
      key: k,
      label: k,
      bestPractice: "bp",
      score: 70,
      rationale: "",
      suggestion: "",
    }));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior dimensions and updates scores", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "bp" },
      { key: "b", label: "B", bestPractice: "bp" },
    ];
    const newItems = [
      {
        key: "a",
        label: "A",
        bestPractice: "bp",
        score: 90,
        rationale: "new",
        suggestion: "sug",
      },
      {
        key: "b",
        label: "B",
        bestPractice: "bp",
        score: 75,
        rationale: "new",
        suggestion: "sug",
      },
    ];
    const result = normalizeDynamicCriteria(newItems, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(90);
    expect(result[1].score).toBe(75);
  });

  it("preserves prior labels and bestPractice when locked", () => {
    const prior = [{ key: "a", label: "Anchored Label", bestPractice: "Anchored BP" }];
    const result = normalizeDynamicCriteria(
      [{ key: "a", label: "New Label", bestPractice: "New BP", score: 80, rationale: "", suggestion: "" }],
      prior,
    );
    expect(result[0].label).toBe("Anchored Label");
    expect(result[0].bestPractice).toBe("Anchored BP");
  });

  it("handles undefined items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("filters items without a string key", () => {
    const bad = [null, { key: 123, label: "x", bestPractice: "b", score: 50, rationale: "", suggestion: "" }] as never;
    const result = normalizeDynamicCriteria(bad, null);
    expect(result).toEqual([]);
  });
});
