import { describe, it, expect } from "vitest";
import {
  defaultProfile,
  levelFromXp,
  levelProgress,
  addConcept,
  xpPerPart,
  XP_PER_CORRECT,
} from "@/lib/profile";

describe("defaultProfile", () => {
  it("creates a zeroed profile", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.partsBuilt).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.name).toBe("");
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 for 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("advances a level every 100 XP", () => {
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(199)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
  });
});

describe("levelProgress", () => {
  it("returns 0 at the start of a level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });

  it("returns 0.5 halfway through a level", () => {
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(150)).toBe(0.5);
  });

  it("stays below 1 at end of level", () => {
    expect(levelProgress(99)).toBeCloseTo(0.99);
  });
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    expect(addConcept([], "Arrays")).toEqual(["Arrays"]);
  });

  it("does not duplicate an existing concept", () => {
    expect(addConcept(["Arrays"], "Arrays")).toEqual(["Arrays"]);
  });

  it("trims whitespace from the concept", () => {
    expect(addConcept([], "  Functions  ")).toEqual(["Functions"]);
  });

  it("ignores empty strings", () => {
    expect(addConcept(["Arrays"], "")).toEqual(["Arrays"]);
    expect(addConcept(["Arrays"], "   ")).toEqual(["Arrays"]);
  });
});

describe("constants", () => {
  it("xpPerPart is 25", () => {
    expect(xpPerPart).toBe(25);
  });

  it("XP_PER_CORRECT is 10", () => {
    expect(XP_PER_CORRECT).toBe(10);
  });
});
