import { describe, it, expect } from "vitest";
import {
  defaultProfile,
  levelFromXp,
  levelProgress,
  addConcept,
  xpPerPart,
} from "../lib/profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => expect(levelFromXp(0)).toBe(1));
  it("is level 1 just before 100 XP", () => expect(levelFromXp(99)).toBe(1));
  it("reaches level 2 at exactly 100 XP", () => expect(levelFromXp(100)).toBe(2));
  it("reaches level 3 at 200 XP", () => expect(levelFromXp(200)).toBe(3));
});

describe("levelProgress", () => {
  it("is 0 at the start of a level", () => expect(levelProgress(0)).toBe(0));
  it("is 0.5 halfway through a level", () => expect(levelProgress(50)).toBeCloseTo(0.5));
  it("is 0 again at a level boundary", () => expect(levelProgress(100)).toBe(0));
  it("stays in 0..1 range", () => {
    for (const xp of [0, 25, 75, 99, 100, 150]) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    expect(addConcept([], "Arrays")).toEqual(["Arrays"]);
  });

  it("does not add duplicates", () => {
    expect(addConcept(["Arrays"], "Arrays")).toEqual(["Arrays"]);
  });

  it("ignores empty strings", () => {
    expect(addConcept(["Arrays"], "")).toEqual(["Arrays"]);
    expect(addConcept(["Arrays"], "   ")).toEqual(["Arrays"]);
  });

  it("trims whitespace before adding", () => {
    expect(addConcept([], "  Loops  ")).toEqual(["Loops"]);
  });
});

describe("defaultProfile", () => {
  it("returns a profile with zeroed stats", () => {
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

describe("xpPerPart", () => {
  it("is a positive number", () => {
    expect(xpPerPart).toBeGreaterThan(0);
  });
});
