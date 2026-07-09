import { describe, expect, it } from "vitest";
import { addConcept, defaultProfile, levelFromXp, levelProgress, XP_PER_CORRECT, xpPerPart } from "./profile";

describe("defaultProfile", () => {
  it("starts at zero XP with no concepts learned", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
  });
});

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
  it("is the fractional progress through the current level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(100)).toBe(0);
    expect(levelProgress(150)).toBe(0.5);
  });
});

describe("addConcept", () => {
  it("appends a new, trimmed concept", () => {
    expect(addConcept([], "  loops  ")).toEqual(["loops"]);
  });

  it("does not add a duplicate concept", () => {
    expect(addConcept(["loops"], "loops")).toEqual(["loops"]);
  });

  it("ignores a blank concept", () => {
    expect(addConcept(["loops"], "   ")).toEqual(["loops"]);
  });
});

describe("constants", () => {
  it("exposes positive XP rewards", () => {
    expect(xpPerPart).toBeGreaterThan(0);
    expect(XP_PER_CORRECT).toBeGreaterThan(0);
  });
});
