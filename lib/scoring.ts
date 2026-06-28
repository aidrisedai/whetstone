import type { Assessment, CriterionSpec, Dimension, DynamicCriterion } from "./types";

/** Overall score the idea must reach before it auto-exports to the builder. */
export const DEFAULT_THRESHOLD = clampInt(process.env.WHETSTONE_THRESHOLD, 80);

/** No single dimension may lag below this, so one strong score can't carry a weak idea. */
export const DIMENSION_FLOOR = 65;

export function clamp(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function dimensionScores(a: {
  clarity: Dimension;
  conciseness: Dimension;
  dynamicCriteria: DynamicCriterion[];
}): number[] {
  return [
    clamp(a.clarity.score),
    clamp(a.conciseness.score),
    ...a.dynamicCriteria.map((d) => clamp(d.score)),
  ];
}

export function computeOverall(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, n) => acc + n, 0);
  return Math.round(sum / scores.length);
}

/** The export gate: high overall AND every dimension clearing the floor. */
export function isReady(overall: number, scores: number[], threshold: number): boolean {
  if (scores.length === 0) return false;
  return overall >= threshold && Math.min(...scores) >= DIMENSION_FLOOR;
}

/**
 * Normalize a raw model assessment: clamp every score, compute the overall mean
 * and the ready flag deterministically (never trusting the model to decide the
 * threshold), and stamp the active threshold.
 */
export function finalizeAssessment(
  raw: Omit<Assessment, "overall" | "ready" | "threshold">,
  threshold: number = DEFAULT_THRESHOLD,
): Assessment {
  const clarity = { ...raw.clarity, score: clamp(raw.clarity.score) };
  const conciseness = { ...raw.conciseness, score: clamp(raw.conciseness.score) };
  const dynamicCriteria = raw.dynamicCriteria.map((d) => ({ ...d, score: clamp(d.score) }));
  const scores = dimensionScores({ clarity, conciseness, dynamicCriteria });
  const overall = computeOverall(scores);
  return {
    ...raw,
    clarity,
    conciseness,
    dynamicCriteria,
    overall,
    ready: isReady(overall, scores, threshold),
    threshold,
  };
}

/**
 * Make the dynamic dimensions safe and stable: dedupe by key (the model can
 * echo the reused set, producing duplicates), and — once criteria are fixed for
 * the session — lock the result to exactly that set, in order, pulling each
 * one's latest score/rationale/suggestion. On the first assessment, cap to 3.
 */
export function normalizeDynamicCriteria(
  items: DynamicCriterion[] | undefined,
  prior: CriterionSpec[] | null,
): DynamicCriterion[] {
  const list = Array.isArray(items) ? items.filter((it) => it && typeof it.key === "string") : [];
  const byKey = new Map<string, DynamicCriterion>();
  for (const it of list) {
    if (!byKey.has(it.key)) byKey.set(it.key, it);
  }
  const deduped = [...byKey.values()];

  if (prior && prior.length > 0) {
    return prior.map((spec, i) => {
      const match = byKey.get(spec.key) ?? deduped[i] ?? null;
      return {
        key: spec.key,
        label: spec.label,
        bestPractice: spec.bestPractice,
        score: clamp(match?.score ?? 0),
        rationale: match?.rationale ?? "",
        suggestion: match?.suggestion ?? "",
      };
    });
  }
  return deduped.slice(0, 3);
}

function clampInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return fallback;
  return Math.max(1, Math.min(100, Math.round(n)));
}
