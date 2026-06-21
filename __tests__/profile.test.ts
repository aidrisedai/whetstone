import { describe, it, expect } from "vitest";
import {
  addConcept,
  defaultProfile,
  levelFromXp,
  levelProgress,
  xpPerPart,
  XP_PER_CORRECT,
} from "@/lib/profile";

describe("defaultProfile", () => {
  it("returns a profile with zero stats", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
  });

  it("sets a createdAt timestamp close to now", () => {
    const before = Date.now();
    const p = defaultProfile();
    const after = Date.now();
    expect(p.createdAt).toBeGreaterThanOrEqual(before);
    expect(p.createdAt).toBeLessThanOrEqual(after);
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => expect(levelFromXp(0)).toBe(1));
  it("stays level 1 below 100 XP", () => expect(levelFromXp(99)).toBe(1));
  it("reaches level 2 at exactly 100 XP", () => expect(levelFromXp(100)).toBe(2));
  it("levels up linearly", () => {
    expect(levelFromXp(200)).toBe(3);
    expect(levelFromXp(300)).toBe(4);
  });
});

describe("levelProgress", () => {
  it("returns 0 at the start of a level", () => expect(levelProgress(0)).toBe(0));
  it("returns 0.5 halfway through a level", () => expect(levelProgress(50)).toBe(0.5));
  it("returns 0 at the exact start of the next level", () => expect(levelProgress(100)).toBe(0));
  it("stays between 0 and 1", () => {
    for (const xp of [0, 25, 50, 75, 99, 100, 150, 200]) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});

describe("addConcept", () => {
  it("adds a new concept to the list", () => {
    expect(addConcept([], "Loops")).toEqual(["Loops"]);
  });

  it("does not add duplicates", () => {
    expect(addConcept(["Loops"], "Loops")).toEqual(["Loops"]);
  });

  it("appends to an existing list", () => {
    expect(addConcept(["Loops"], "State")).toEqual(["Loops", "State"]);
  });

  it("ignores blank/whitespace-only strings", () => {
    expect(addConcept(["X"], "  ")).toEqual(["X"]);
    expect(addConcept(["X"], "")).toEqual(["X"]);
  });
});

describe("xpPerPart", () => {
  it("is a positive number", () => expect(xpPerPart).toBeGreaterThan(0));
});

describe("XP_PER_CORRECT", () => {
  it("is a positive number", () => expect(XP_PER_CORRECT).toBeGreaterThan(0));
});
