import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  DIMENSION_FLOOR,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "../lib/scoring";
import type { DynamicCriterion } from "../lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("passes values inside [0,100] through", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps values below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("averages a single value", () => {
    expect(computeOverall([70])).toBe(70);
  });

  it("averages multiple values and rounds", () => {
    expect(computeOverall([60, 70, 80])).toBe(70);
    expect(computeOverall([60, 61])).toBe(61); // 60.5 → 61
  });
});

describe("isReady", () => {
  it("returns false when scores array is empty", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores clear floor", () => {
    expect(isReady(80, [65, 70, 80], 80)).toBe(true);
    expect(isReady(90, [66, 100], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [70, 80, 85], 80)).toBe(false);
  });

  it(`returns false when any score is below DIMENSION_FLOOR (${DIMENSION_FLOOR})`, () => {
    expect(isReady(85, [64, 90, 90], 80)).toBe(false);
    expect(isReady(85, [65, 90, 90], 80)).toBe(true);
  });
});

describe("dimensionScores", () => {
  it("returns clamped clarity + conciseness + dynamic scores", () => {
    const result = dimensionScores({
      clarity: dim(75),
      conciseness: dim(85),
      dynamicCriteria: [dyn("a", 95), dyn("b", 55)],
    });
    expect(result).toEqual([75, 85, 95, 55]);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "game",
    clarity: dim(70),
    conciseness: dim(80),
    dynamicCriteria: [dyn("feasibility", 90)],
    refinedPrompt: "A fun game.",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((70 + 80 + 90) / 3));
  });

  it("sets ready=true when overall and all scores pass", () => {
    const highRaw = {
      ...raw,
      clarity: dim(82),
      conciseness: dim(82),
      dynamicCriteria: [dyn("feasibility", 82)],
    };
    const result = finalizeAssessment(highRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(raw, 90);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold on the assessment", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores before computing", () => {
    const overRaw = {
      ...raw,
      clarity: dim(120),
      conciseness: dim(-10),
      dynamicCriteria: [dyn("feasibility", 110)],
    };
    const result = finalizeAssessment(overRaw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.dynamicCriteria[0].score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("returns empty list for undefined input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("deduplicates by key, keeping first occurrence", () => {
    const items = [dyn("a", 70), dyn("a", 90), dyn("b", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first occurrence kept
  });

  it("caps to 3 items when no prior is set", () => {
    const items = [dyn("a", 70), dyn("b", 80), dyn("c", 90), dyn("d", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior keys and order when prior is set", () => {
    const prior = [
      { key: "x", label: "X", bestPractice: "bp" },
      { key: "y", label: "Y", bestPractice: "bp" },
    ];
    const items = [dyn("y", 88), dyn("x", 77)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(77);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(88);
  });

  it("uses prior label and bestPractice, not model-returned values", () => {
    const prior = [{ key: "a", label: "Official Label", bestPractice: "Official BP" }];
    const items = [{ ...dyn("a", 80), label: "Model Label", bestPractice: "Model BP" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Official Label");
    expect(result[0].bestPractice).toBe("Official BP");
  });
});
