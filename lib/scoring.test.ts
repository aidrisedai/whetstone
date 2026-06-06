import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("handles NaN as 0", () => expect(clamp(NaN)).toBe(0));
  it("handles non-number as 0", () => expect(clamp("x" as unknown as number)).toBe(0));
  it("passes through 0 and 100 unchanged", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages two equal scores", () => expect(computeOverall([80, 80])).toBe(80));
  it("averages mixed scores", () => expect(computeOverall([70, 90])).toBe(80));
  it("rounds the mean", () => expect(computeOverall([70, 71])).toBe(71));
  it("handles a single score", () => expect(computeOverall([75])).toBe(75));
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(80, [], 80)).toBe(false));
  it("passes when overall meets threshold and all above floor", () =>
    expect(isReady(80, [80, 80, 80], 80)).toBe(true));
  it("fails when overall is below threshold", () =>
    expect(isReady(79, [80, 80, 80], 80)).toBe(false));
  it("fails when one dimension is below DIMENSION_FLOOR", () =>
    expect(isReady(80, [80, 80, DIMENSION_FLOOR - 1], 80)).toBe(false));
  it("passes exactly at DIMENSION_FLOOR", () =>
    expect(isReady(80, [80, 80, DIMENSION_FLOOR], 80)).toBe(true));
  it("respects a custom threshold", () =>
    expect(isReady(90, [90, 90, 90], 90)).toBe(true));
  it("fails just under a custom threshold", () =>
    expect(isReady(89, [89, 89, 89], 90)).toBe(false));
});

// ── dimensionScores ────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("combines clarity, conciseness, and dynamic scores", () => {
    const dynamic: DynamicCriterion[] = [
      { key: "k", label: "L", bestPractice: "bp", score: 70, rationale: "", suggestion: "" },
    ];
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 85, rationale: "", suggestion: "" },
      dynamicCriteria: dynamic,
    });
    expect(scores).toEqual([80, 85, 70]);
  });

  it("clamps each dimension", () => {
    const scores = dimensionScores({
      clarity: { score: 200, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const baseDynamic: DynamicCriterion[] = [
    { key: "k1", label: "L1", bestPractice: "bp1", score: 75, rationale: "", suggestion: "" },
  ];

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: baseDynamic,
      refinedPrompt: "Build something.",
    }, 80);
    expect(result.overall).toBe(Math.round((80 + 70 + 75) / 3));
  });

  it("marks ready when threshold met and no dim below floor", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: { score: 82, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "L1", bestPractice: "bp1", score: 80, rationale: "", suggestion: "" },
      ],
      refinedPrompt: "Build something.",
    }, 80);
    expect(result.ready).toBe(true);
  });

  it("marks not ready when a dimension is below floor", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: { score: 90, rationale: "", suggestion: "" },
      conciseness: { score: 90, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "L1", bestPractice: "bp1", score: 60, rationale: "", suggestion: "" },
      ],
      refinedPrompt: "Build something.",
    }, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range input scores", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -20, rationale: "", suggestion: "" },
      dynamicCriteria: [],
      refinedPrompt: "Build something.",
    }, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: [],
      refinedPrompt: "Build something.",
    }, 75);
    expect(result.threshold).toBe(75);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeCrit = (key: string, score = 80): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "",
    suggestion: "",
  });

  it("deduplicates by key (first wins)", () => {
    const dupes = [makeCrit("a", 70), makeCrit("a", 90)];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = ["a", "b", "c", "d"].map(makeCrit);
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior spec order when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp_b" },
      { key: "a", label: "A", bestPractice: "bp_a" },
    ];
    const incoming = [makeCrit("a", 88), makeCrit("b", 72)];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result.map((r) => r.key)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(72);
    expect(result[1].score).toBe(88);
  });

  it("preserves prior labels and bestPractice when locking", () => {
    const prior: CriterionSpec[] = [
      { key: "x", label: "My Label", bestPractice: "my_bp" },
    ];
    const incoming = [makeCrit("x", 85)];
    const [r] = normalizeDynamicCriteria(incoming, prior);
    expect(r.label).toBe("My Label");
    expect(r.bestPractice).toBe("my_bp");
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("ignores items with missing keys", () => {
    const bad = [{ score: 80, rationale: "", suggestion: "" }] as unknown as DynamicCriterion[];
    expect(normalizeDynamicCriteria(bad, null)).toHaveLength(0);
  });
});
