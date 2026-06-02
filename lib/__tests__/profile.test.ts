import { describe, it, expect } from "vitest";
import { levelFromXp, levelProgress, addConcept, defaultProfile } from "../profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => expect(levelFromXp(0)).toBe(1));
  it("reaches level 2 at 100 XP", () => expect(levelFromXp(100)).toBe(2));
  it("reaches level 3 at 200 XP", () => expect(levelFromXp(200)).toBe(3));
  it("doesn't level up at 99 XP", () => expect(levelFromXp(99)).toBe(1));
});

describe("levelProgress", () => {
  it("is 0 at the start of a level", () => expect(levelProgress(0)).toBe(0));
  it("is 0.5 at halfway through a level", () => expect(levelProgress(50)).toBe(0.5));
  it("resets at a level boundary", () => expect(levelProgress(100)).toBe(0));
  it("is 0.25 at 25 XP into a level", () => expect(levelProgress(125)).toBe(0.25));
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    expect(addConcept([], "Loops")).toEqual(["Loops"]);
  });
  it("does not duplicate an existing concept", () => {
    expect(addConcept(["Loops"], "Loops")).toEqual(["Loops"]);
  });
  it("ignores empty strings", () => {
    expect(addConcept(["A"], "")).toEqual(["A"]);
    expect(addConcept(["A"], "   ")).toEqual(["A"]);
  });
  it("preserves existing concepts", () => {
    expect(addConcept(["A", "B"], "C")).toEqual(["A", "B", "C"]);
  });
});

describe("defaultProfile", () => {
  it("returns a profile with zero xp and empty arrays", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
  });
});
