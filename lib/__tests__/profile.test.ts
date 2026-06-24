import { describe, expect, it } from "vitest";
import { addConcept, defaultProfile, levelFromXp, levelProgress } from "../profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });
  it("advances at every 100 XP", () => {
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
  it("returns 0 at level boundaries", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });
  it("returns 0.5 at the midpoint of a level", () => {
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(150)).toBe(0.5);
  });
  it("returns a value between 0 and 1", () => {
    for (let xp = 0; xp <= 500; xp += 13) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    expect(addConcept([], "loops")).toEqual(["loops"]);
    expect(addConcept(["loops"], "arrays")).toEqual(["loops", "arrays"]);
  });
  it("does not duplicate existing concepts", () => {
    expect(addConcept(["loops"], "loops")).toEqual(["loops"]);
  });
  it("trims and ignores blank concepts", () => {
    expect(addConcept(["loops"], "  ")).toEqual(["loops"]);
    expect(addConcept(["loops"], "  arrays  ")).toEqual(["loops", "arrays"]);
  });
});

describe("defaultProfile", () => {
  it("starts with zero XP and empty lists", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
  });
});
