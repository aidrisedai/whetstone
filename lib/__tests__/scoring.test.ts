import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";

describe("clamp", () => {
  it("clamps to 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(74.6)).toBe(75);
    expect(clamp(74.4)).toBe(74);
  });

  it("handles non-numeric values", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores", () => {
    const a = {
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "K1", bestPractice: "", score: 90, rationale: "", suggestion: "" },
        { key: "k2", label: "K2", bestPractice: "", score: 60, rationale: "", suggestion: "" },
      ],
    };
    expect(dimensionScores(a)).toEqual([80, 70, 90, 60]);
  });

  it("clamps out-of-range scores", () => {
    const a = {
      clarity: { score: 120, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    };
    expect(dimensionScores(a)).toEqual([100, 0]);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([80, 70, 90, 60])).toBe(75);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds correctly", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 → 81
  });
});

describe("isReady", () => {
  const threshold = 80;

  it("returns true when overall meets threshold and all dims clear DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, 80, 90], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [90, 90, 90], threshold)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR", () => {
    const scores = [90, DIMENSION_FLOOR - 1, 90];
    expect(isReady(85, scores, threshold)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(85, [], threshold)).toBe(false);
  });

  it("requires ALL dims to clear the floor, not just overall", () => {
    // One weak dimension drags the floor below 65 even though overall is high
    expect(isReady(80, [100, 100, 64], threshold)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: { score: 80, rationale: "good", suggestion: "" },
    conciseness: { score: 70, rationale: "ok", suggestion: "" },
    dynamicCriteria: [
      { key: "k1", label: "K1", bestPractice: "", score: 90, rationale: "", suggestion: "" },
    ],
    refinedPrompt: "Build me a todo app",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    // (80 + 70 + 90) / 3 = 80
    expect(result.overall).toBe(80);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("sets ready=true when conditions met", () => {
    const result = finalizeAssessment(base, 80); // overall=80, all ≥ 65
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when below threshold", () => {
    const result = finalizeAssessment(base, 90);
    expect(result.ready).toBe(false);
  });

  it("clamps raw scores before computing overall", () => {
    const raw = {
      ...base,
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw, 80);
    // clarity clamped to 100, conciseness to 0, dynamic stays 90
    // overall = (100 + 0 + 90) / 3 = 63
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(63);
  });
});

describe("normalizeDynamicCriteria", () => {
  const item = (key: string, score: number) => ({
    key,
    label: key.toUpperCase(),
    bestPractice: "bp",
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates by key (first occurrence wins)", () => {
    const items = [item("a", 80), item("a", 60), item("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 items on first assessment (no prior)", () => {
    const items = [item("a", 80), item("b", 70), item("c", 90), item("d", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria keys when prior is set", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "bp" },
      { key: "b", label: "B", bestPractice: "bp" },
    ];
    // "b" is not in items; the function falls back to deduped[1] ("c") by index
    const items = [item("a", 90), item("c", 80)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]); // keys always come from prior
    expect(result[0].score).toBe(90); // matched by key
    expect(result[1].score).toBe(80); // fallback: deduped[1] = item("c",80)
  });

  it("returns score 0 when prior key has no match and no positional fallback", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "bp" },
      { key: "b", label: "B", bestPractice: "bp" },
    ];
    // Only one item — prior[1] has no key match and no deduped[1] to fall back to
    const items = [item("a", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[1].score).toBe(0);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
