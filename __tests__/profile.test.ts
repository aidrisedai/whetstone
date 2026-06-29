import { describe, it, expect } from "vitest";
import {
  levelFromXp,
  levelProgress,
  addConcept,
  defaultProfile,
  xpPerPart,
  XP_PER_CORRECT,
} from "@/lib/profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => expect(levelFromXp(0)).toBe(1));
  it("stays level 1 below 100 XP", () => expect(levelFromXp(99)).toBe(1));
  it("reaches level 2 at exactly 100 XP", () => expect(levelFromXp(100)).toBe(2));
  it("reaches level 3 at 200 XP", () => expect(levelFromXp(200)).toBe(3));
  it("handles large XP values", () => expect(levelFromXp(950)).toBe(10));
});

describe("levelProgress", () => {
  it("returns 0 at level start", () => expect(levelProgress(0)).toBe(0));
  it("returns 0.5 halfway through a level", () => expect(levelProgress(50)).toBe(0.5));
  it("returns 0 again exactly at a new level", () => expect(levelProgress(100)).toBe(0));
  it("returns 0.25 at 25 XP into a level", () => expect(levelProgress(125)).toBe(0.25));
  it("returns a value between 0 and 1 exclusively before the boundary", () => {
    const p = levelProgress(99);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe("addConcept", () => {
  it("adds a new concept to the list", () => {
    expect(addConcept([], "variables")).toEqual(["variables"]);
  });

  it("does not add duplicates", () => {
    expect(addConcept(["variables"], "variables")).toEqual(["variables"]);
  });

  it("ignores empty strings", () => {
    expect(addConcept(["variables"], "")).toEqual(["variables"]);
  });

  it("trims whitespace before adding", () => {
    expect(addConcept([], "  functions  ")).toEqual(["functions"]);
  });

  it("adds a second distinct concept", () => {
    expect(addConcept(["variables"], "loops")).toEqual(["variables", "loops"]);
  });
});

describe("defaultProfile", () => {
  it("returns a profile with zero XP", () => {
    expect(defaultProfile().xp).toBe(0);
  });

  it("returns empty conceptsLearned", () => {
    expect(defaultProfile().conceptsLearned).toEqual([]);
  });

  it("returns zeroed counters", () => {
    const p = defaultProfile();
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
  });
});

describe("XP constants", () => {
  it("xpPerPart is 25", () => expect(xpPerPart).toBe(25));
  it("XP_PER_CORRECT is 10", () => expect(XP_PER_CORRECT).toBe(10));
});
