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
  it("returns a profile with zeroed numeric fields", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.name).toBe("");
    expect(p.favoriteGame).toBe("");
  });

  it("stamps a createdAt timestamp", () => {
    const before = Date.now();
    const p = defaultProfile();
    const after = Date.now();
    expect(p.createdAt).toBeGreaterThanOrEqual(before);
    expect(p.createdAt).toBeLessThanOrEqual(after);
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("stays at level 1 until 100 XP", () => {
    expect(levelFromXp(99)).toBe(1);
  });

  it("advances to level 2 at exactly 100 XP", () => {
    expect(levelFromXp(100)).toBe(2);
  });

  it("advances to level 3 at 200 XP", () => {
    expect(levelFromXp(200)).toBe(3);
  });

  it("increases linearly", () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      expect(levelFromXp((lvl - 1) * 100)).toBe(lvl);
    }
  });
});

describe("levelProgress", () => {
  it("is 0 at the start of a level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
    expect(levelProgress(200)).toBe(0);
  });

  it("is 0.5 at the midpoint", () => {
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(150)).toBe(0.5);
  });

  it("approaches 1 just before the next level", () => {
    expect(levelProgress(99)).toBeCloseTo(0.99);
    expect(levelProgress(199)).toBeCloseTo(0.99);
  });
});

describe("addConcept", () => {
  it("adds a new concept to the list", () => {
    expect(addConcept([], "loops")).toEqual(["loops"]);
    expect(addConcept(["loops"], "functions")).toEqual(["loops", "functions"]);
  });

  it("does not duplicate an existing concept", () => {
    expect(addConcept(["loops"], "loops")).toEqual(["loops"]);
    expect(addConcept(["loops", "arrays"], "arrays")).toEqual(["loops", "arrays"]);
  });

  it("ignores blank or whitespace-only concepts", () => {
    expect(addConcept(["loops"], "")).toEqual(["loops"]);
    expect(addConcept(["loops"], "   ")).toEqual(["loops"]);
  });

  it("trims whitespace before comparing", () => {
    // "  loops  " trims to "loops", which already exists
    expect(addConcept(["loops"], "  loops  ")).toEqual(["loops"]);
  });
});

describe("XP constants", () => {
  it("xpPerPart is a positive number", () => {
    expect(xpPerPart).toBeGreaterThan(0);
  });

  it("XP_PER_CORRECT is a positive number", () => {
    expect(XP_PER_CORRECT).toBeGreaterThan(0);
  });
});
