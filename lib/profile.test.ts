import { describe, it, expect } from "vitest";
import {
  defaultProfile,
  levelFromXp,
  levelProgress,
  addConcept,
  xpPerPart,
  XP_PER_CORRECT,
} from "./profile";

describe("defaultProfile", () => {
  it("starts at zero XP and empty history", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
  });

  it("stamps createdAt as a recent timestamp", () => {
    const before = Date.now();
    const p = defaultProfile();
    const after = Date.now();
    expect(p.createdAt).toBeGreaterThanOrEqual(before);
    expect(p.createdAt).toBeLessThanOrEqual(after);
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => expect(levelFromXp(0)).toBe(1));
  it("advances to level 2 at 100 XP", () => expect(levelFromXp(100)).toBe(2));
  it("advances to level 3 at 200 XP", () => expect(levelFromXp(200)).toBe(3));
  it("stays at level 2 with 199 XP", () => expect(levelFromXp(199)).toBe(2));
  it("each xpPerPart increments toward the next level", () => {
    const levelsNeeded = 100 / xpPerPart;
    expect(Number.isInteger(levelsNeeded)).toBe(true);
  });
});

describe("levelProgress", () => {
  it("is 0 at the start of a level", () => expect(levelProgress(0)).toBe(0));
  it("is 0.5 halfway through a level", () => expect(levelProgress(50)).toBe(0.5));
  it("approaches 1 at the top of a level", () => expect(levelProgress(99)).toBeCloseTo(0.99));
  it("resets to 0 at the next level boundary", () => expect(levelProgress(100)).toBe(0));
  it("stays within 0..1 for any positive XP", () => {
    for (const xp of [0, 25, 50, 75, 99, 100, 150, 250]) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    expect(addConcept([], "useState")).toEqual(["useState"]);
  });
  it("does not duplicate an existing concept", () => {
    const list = ["useState", "useEffect"];
    expect(addConcept(list, "useState")).toEqual(list);
  });
  it("trims whitespace before comparing", () => {
    const list = ["useState"];
    expect(addConcept(list, "  useState  ")).toEqual(list);
  });
  it("ignores empty-string concepts", () => {
    expect(addConcept(["x"], "")).toEqual(["x"]);
    expect(addConcept(["x"], "   ")).toEqual(["x"]);
  });
  it("does not mutate the input array", () => {
    const list = ["a"];
    const result = addConcept(list, "b");
    expect(list).toEqual(["a"]);
    expect(result).toEqual(["a", "b"]);
  });
});

describe("XP constants", () => {
  it("XP_PER_CORRECT is positive", () => expect(XP_PER_CORRECT).toBeGreaterThan(0));
  it("xpPerPart is positive", () => expect(xpPerPart).toBeGreaterThan(0));
  it("four parts earn at least one level", () =>
    expect(levelFromXp(xpPerPart * 4)).toBeGreaterThan(1));
});
