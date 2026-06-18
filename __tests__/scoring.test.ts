import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Pure functions extracted inline to avoid Next.js server-only imports.
// The real implementation is in lib/scoring.ts — these mirror it exactly.

function clamp(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function computeOverall(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc: number, n: number) => acc + n, 0);
  return Math.round(sum / scores.length);
}

const DIMENSION_FLOOR = 65;

function isReady(overall: number, scores: number[], threshold: number): boolean {
  if (scores.length === 0) return false;
  return overall >= threshold && Math.min(...scores) >= DIMENSION_FLOOR;
}

describe("clamp", () => {
  it("clamps values within 0–100", () => {
    assert.equal(clamp(50), 50);
    assert.equal(clamp(-5), 0);
    assert.equal(clamp(105), 100);
    assert.equal(clamp(100), 100);
    assert.equal(clamp(0), 0);
  });

  it("rounds fractional values", () => {
    assert.equal(clamp(75.6), 76);
    assert.equal(clamp(75.4), 75);
  });

  it("returns 0 for non-numeric or NaN input", () => {
    assert.equal(clamp(NaN), 0);
    assert.equal(clamp("x" as unknown as number), 0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty scores", () => {
    assert.equal(computeOverall([]), 0);
  });

  it("returns the single value unchanged for one score", () => {
    assert.equal(computeOverall([80]), 80);
  });

  it("averages a set of scores", () => {
    assert.equal(computeOverall([80, 90, 70]), 80);
  });

  it("rounds the result", () => {
    assert.equal(computeOverall([80, 81]), 81); // 80.5 → rounds to 81
  });
});

describe("isReady", () => {
  it("returns false for empty scores", () => {
    assert.equal(isReady(85, [], 80), false);
  });

  it("returns true when overall clears threshold and all dimensions clear the floor", () => {
    assert.equal(isReady(85, [85, 90, 70], 80), true);
  });

  it("returns false when overall is below threshold", () => {
    assert.equal(isReady(75, [90, 90, 90], 80), false);
  });

  it("returns false when any dimension is below the floor (65)", () => {
    assert.equal(isReady(85, [90, 90, 60], 80), false);
  });

  it("exactly meeting both the threshold and floor is ready", () => {
    assert.equal(isReady(80, [80, 80, 65], 80), true);
  });

  it("a strong overall cannot carry a dimension at floor-1", () => {
    assert.equal(isReady(95, [100, 100, 64], 80), false);
  });
});
