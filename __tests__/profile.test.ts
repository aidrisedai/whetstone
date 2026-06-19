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
  it("returns a profile with zero stats", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.name).toBe("");
    expect(p.favoriteGame).toBe("");
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => expect(levelFromXp(0)).toBe(1));
  it("is level 1 up to 99 XP", () => expect(levelFromXp(99)).toBe(1));
  it("is level 2 at 100 XP", () => expect(levelFromXp(100)).toBe(2));
  it("is level 3 at 200 XP", () => expect(levelFromXp(200)).toBe(3));
  it("scales linearly", () => {
    expect(levelFromXp(500)).toBe(6);
  });
});

describe("levelProgress", () => {
  it("is 0 at exactly a level boundary", () => expect(levelProgress(0)).toBe(0));
  it("is 0.5 halfway through a level", () => expect(levelProgress(50)).toBe(0.5));
  it("is 0.99 just before the next level", () => expect(levelProgress(99)).toBeCloseTo(0.99));
  it("resets to 0 at the next level boundary", () => expect(levelProgress(100)).toBe(0));
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    expect(addConcept([], "Loops")).toEqual(["Loops"]);
  });

  it("does not add duplicates", () => {
    expect(addConcept(["Loops"], "Loops")).toEqual(["Loops"]);
  });

  it("ignores empty strings", () => {
    expect(addConcept(["Loops"], "")).toEqual(["Loops"]);
    expect(addConcept([], "  ")).toEqual([]);
  });

  it("trims whitespace before deduplication", () => {
    expect(addConcept(["Loops"], "  Loops  ")).toEqual(["Loops"]);
  });

  it("preserves existing concepts when adding new", () => {
    const result = addConcept(["Loops", "Events"], "State");
    expect(result).toEqual(["Loops", "Events", "State"]);
  });
});

describe("XP constants", () => {
  it("xpPerPart is a positive number", () => expect(xpPerPart).toBeGreaterThan(0));
  it("XP_PER_CORRECT is a positive number", () => expect(XP_PER_CORRECT).toBeGreaterThan(0));
});
