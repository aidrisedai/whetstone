import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  DIMENSION_FLOOR,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "./scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "./types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("leaves values in range unchanged (after rounding)", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
    expect(clamp(99.9)).toBe(100);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-numbers passed at runtime", () => {
    // @ts-expect-error — deliberate runtime test
    expect(clamp("oops")).toBe(0);
    // @ts-expect-error
    expect(clamp(null)).toBe(0);
    // @ts-expect-error
    expect(clamp(undefined)).toBe(0);
  });
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("computes the mean of a set of scores", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 → 81
    expect(computeOverall([80, 80, 81])).toBe(80); // 80.33… → 80
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles a single score", () => {
    expect(computeOverall([75])).toBe(75);
  });
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("is true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(90, [90, 75, 80], 80)).toBe(true);
  });

  it("is false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("is false when any dimension is below DIMENSION_FLOOR", () => {
    const low = DIMENSION_FLOOR - 1;
    expect(isReady(90, [90, 90, low], 80)).toBe(false);
  });

  it("is false with an empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 75)).toBe(false);
  });
});

// ── dimensionScores ────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns [clarity, conciseness, ...dynamic] in order", () => {
    const dim = (score: number) => ({ score, rationale: "", suggestion: "" });
    const dyn = (key: string, score: number): DynamicCriterion => ({
      key,
      label: key,
      bestPractice: key,
      score,
      rationale: "",
      suggestion: "",
    });
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dyn("a", 90), dyn("b", 60)],
    });
    expect(scores).toEqual([80, 70, 90, 60]);
  });

  it("clamps each score", () => {
    const dim = (score: number) => ({ score, rationale: "", suggestion: "" });
    const scores = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
  const makeDyn = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("computes overall as the clamped mean", () => {
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: makeDim(80),
        conciseness: makeDim(80),
        dynamicCriteria: [makeDyn("k", 80)],
        refinedPrompt: "Build it",
      },
      80,
    );
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when threshold is crossed and all dims clear floor", () => {
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: makeDim(85),
        conciseness: makeDim(82),
        dynamicCriteria: [makeDyn("k", 80)],
        refinedPrompt: "Build it",
      },
      80,
    );
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: makeDim(50),
        conciseness: makeDim(50),
        dynamicCriteria: [makeDyn("k", 50)],
        refinedPrompt: "Build it",
      },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("sets ready=false when a dimension is below DIMENSION_FLOOR even if overall is high", () => {
    const floor = DIMENSION_FLOOR - 1;
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: makeDim(95),
        conciseness: makeDim(95),
        dynamicCriteria: [makeDyn("k", floor)],
        refinedPrompt: "Build it",
      },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores returned by the model", () => {
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: makeDim(150),
        conciseness: makeDim(-10),
        dynamicCriteria: [],
        refinedPrompt: "Build it",
      },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeDyn = (key: string, score = 75): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "r",
    suggestion: "s",
  });
  const makeSpec = (key: string): CriterionSpec => ({ key, label: key, bestPractice: key });

  it("deduplicates by key on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(
      [makeDyn("a"), makeDyn("b"), makeDyn("a")],
      null,
    );
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
  });

  it("caps to 3 on first assessment", () => {
    const result = normalizeDynamicCriteria(
      [makeDyn("a"), makeDyn("b"), makeDyn("c"), makeDyn("d")],
      null,
    );
    expect(result.length).toBe(3);
  });

  it("locks to prior specs on subsequent assessments, in prior order", () => {
    const prior: CriterionSpec[] = [makeSpec("c"), makeSpec("a")];
    const result = normalizeDynamicCriteria([makeDyn("a", 80), makeDyn("b", 70)], prior);
    expect(result.map((d) => d.key)).toEqual(["c", "a"]);
    expect(result[1].score).toBe(80); // picks up the score for "a"
  });

  it("preserves prior label and bestPractice even if model echoes different values", () => {
    const prior: CriterionSpec[] = [{ key: "a", label: "Original label", bestPractice: "bp_a" }];
    const modelReturned: DynamicCriterion[] = [
      { key: "a", label: "CHANGED LABEL", bestPractice: "CHANGED_BP", score: 80, rationale: "r", suggestion: "s" },
    ];
    const result = normalizeDynamicCriteria(modelReturned, prior);
    expect(result[0].label).toBe("Original label");
    expect(result[0].bestPractice).toBe("bp_a");
  });

  it("returns empty array for undefined/null input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("ignores items without a key", () => {
    const bad = [{ score: 80, rationale: "r", suggestion: "s" }] as unknown as DynamicCriterion[];
    expect(normalizeDynamicCriteria(bad, null)).toEqual([]);
  });

  it("falls back to a positional item when prior key is not in model output", () => {
    const prior: CriterionSpec[] = [makeSpec("missing"), makeSpec("a")];
    const result = normalizeDynamicCriteria([makeDyn("a", 80)], prior);
    // "missing" is not in model output → falls back to deduped[0] = "a"
    expect(result[0].key).toBe("missing"); // key locked to prior
    expect(result[1].score).toBe(80); // "a" picks up correct score
  });
});

// ── safeParseJson (via serverUtils, same test-friendly function) ────────────

describe("end-to-end: finalizeAssessment returns consistent threshold", () => {
  it("stamps the threshold on the output regardless of model suggestion", () => {
    const makeDim = (s: number) => ({ score: s, rationale: "", suggestion: "" });
    const makeDyn = (k: string, s: number): DynamicCriterion => ({
      key: k, label: k, bestPractice: k, score: s, rationale: "", suggestion: "",
    });
    const a = finalizeAssessment(
      { projectType: "t", clarity: makeDim(85), conciseness: makeDim(85), dynamicCriteria: [makeDyn("k", 85)], refinedPrompt: "" },
      75,
    );
    const b = finalizeAssessment(
      { projectType: "t", clarity: makeDim(85), conciseness: makeDim(85), dynamicCriteria: [makeDyn("k", 85)], refinedPrompt: "" },
      90,
    );
    expect(a.ready).toBe(true);
    expect(b.ready).toBe(false);
    expect(a.threshold).toBe(75);
    expect(b.threshold).toBe(90);
  });
});
