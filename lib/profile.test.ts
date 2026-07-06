import { describe, expect, it } from "vitest";
import { addConcept, defaultProfile, levelFromXp, levelProgress } from "./profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 xp", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("levels up every 100 xp", () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(250)).toBe(3);
  });
});

describe("levelProgress", () => {
  it("returns progress through the current level as 0..1", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(150)).toBe(0.5);
  });
});

describe("addConcept", () => {
  it("adds a new, trimmed concept", () => {
    expect(addConcept([], "  loops  ")).toEqual(["loops"]);
  });

  it("does not add a duplicate", () => {
    expect(addConcept(["loops"], "loops")).toEqual(["loops"]);
  });

  it("ignores a blank concept", () => {
    expect(addConcept(["loops"], "   ")).toEqual(["loops"]);
  });
});

describe("defaultProfile", () => {
  it("starts at zero xp and empty history", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
  });
});
