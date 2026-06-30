import { describe, it, expect } from "vitest";
import {
  defaultProfile,
  levelFromXp,
  levelProgress,
  addConcept,
  xpPerPart,
} from "../profile";

describe("defaultProfile", () => {
  it("returns a profile with zeroed numeric fields", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
  });

  it("returns a profile with empty string fields", () => {
    const p = defaultProfile();
    expect(p.name).toBe("");
    expect(p.favoriteGame).toBe("");
  });

  it("returns a profile with an empty concepts array", () => {
    const p = defaultProfile();
    expect(p.conceptsLearned).toEqual([]);
  });

  it("sets createdAt to a positive timestamp", () => {
    const p = defaultProfile();
    expect(p.createdAt).toBeGreaterThan(0);
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("advances to level 2 at 100 XP", () => {
    expect(levelFromXp(100)).toBe(2);
  });

  it("advances to level 3 at 200 XP", () => {
    expect(levelFromXp(200)).toBe(3);
  });

  it("stays at level 2 for 199 XP", () => {
    expect(levelFromXp(199)).toBe(2);
  });

  it("xpPerPart is 25 and four parts make one level", () => {
    expect(xpPerPart).toBe(25);
    expect(levelFromXp(xpPerPart * 4)).toBe(2);
  });
});

describe("levelProgress", () => {
  it("returns 0 at the start of a level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });

  it("returns 0.5 at the halfway point", () => {
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(150)).toBe(0.5);
  });

  it("returns a value between 0 and 1", () => {
    for (const xp of [0, 25, 50, 75, 99, 100, 125, 200]) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});

describe("addConcept", () => {
  it("adds a new concept to the list", () => {
    const result = addConcept(["HTML"], "CSS");
    expect(result).toEqual(["HTML", "CSS"]);
  });

  it("does not add a duplicate concept", () => {
    const result = addConcept(["HTML", "CSS"], "CSS");
    expect(result).toEqual(["HTML", "CSS"]);
  });

  it("trims whitespace before deduping", () => {
    const result = addConcept(["CSS"], "  CSS  ");
    expect(result).toEqual(["CSS"]);
  });

  it("ignores blank concept strings", () => {
    expect(addConcept(["HTML"], "")).toEqual(["HTML"]);
    expect(addConcept(["HTML"], "   ")).toEqual(["HTML"]);
  });

  it("returns a new array, not the same reference", () => {
    const list = ["HTML"];
    const result = addConcept(list, "CSS");
    expect(result).not.toBe(list);
  });

  it("works on an empty list", () => {
    expect(addConcept([], "JS")).toEqual(["JS"]);
  });
});
