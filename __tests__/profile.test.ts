import { describe, it, expect } from "vitest";
import { levelFromXp, levelProgress, addConcept, defaultProfile } from "@/lib/profile";

describe("defaultProfile", () => {
  it("has zero XP and empty fields", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 for 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("levels up every 100 XP", () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(199)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
  });

  it("handles large XP values", () => {
    expect(levelFromXp(1000)).toBe(11);
  });
});

describe("levelProgress", () => {
  it("returns 0 at the start of a level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });

  it("returns progress within a level as 0..1", () => {
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(150)).toBe(0.5);
    expect(levelProgress(75)).toBeCloseTo(0.75);
  });

  it("never returns >= 1 (100 XP = new level)", () => {
    expect(levelProgress(99)).toBeCloseTo(0.99);
  });
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    expect(addConcept([], "closures")).toEqual(["closures"]);
  });

  it("does not add duplicates", () => {
    expect(addConcept(["closures"], "closures")).toEqual(["closures"]);
  });

  it("trims whitespace before checking", () => {
    expect(addConcept(["closures"], "  closures  ")).toEqual(["closures"]);
  });

  it("ignores empty strings", () => {
    expect(addConcept(["a"], "")).toEqual(["a"]);
    expect(addConcept(["a"], "   ")).toEqual(["a"]);
  });

  it("preserves existing concepts in order", () => {
    const result = addConcept(["a", "b"], "c");
    expect(result).toEqual(["a", "b", "c"]);
  });
});
