import { describe, it, expect } from "vitest";
import {
  defaultProfile,
  levelFromXp,
  levelProgress,
  addConcept,
  xpPerPart,
  XP_PER_CORRECT,
} from "../profile";

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

  it("sets createdAt to a recent timestamp", () => {
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
  it("reaches level 2 at 100 XP", () => {
    expect(levelFromXp(100)).toBe(2);
  });
  it("reaches level 3 at 200 XP", () => {
    expect(levelFromXp(200)).toBe(3);
  });
  it("stays level 1 below 100 XP", () => {
    expect(levelFromXp(99)).toBe(1);
  });
});

describe("levelProgress", () => {
  it("returns 0 at the start of a level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });
  it("returns 0.5 halfway through a level", () => {
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(150)).toBe(0.5);
  });
  it("returns a value in [0, 1)", () => {
    for (const xp of [0, 25, 75, 99, 100, 199]) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});

describe("addConcept", () => {
  it("appends a new concept to the list", () => {
    const result = addConcept(["Arrays"], "Event delegation");
    expect(result).toEqual(["Arrays", "Event delegation"]);
  });
  it("does not duplicate an existing concept", () => {
    const result = addConcept(["Arrays", "Event delegation"], "Arrays");
    expect(result).toEqual(["Arrays", "Event delegation"]);
  });
  it("ignores blank concepts", () => {
    const result = addConcept(["Arrays"], "   ");
    expect(result).toEqual(["Arrays"]);
  });
  it("returns unchanged list for empty concept", () => {
    const result = addConcept(["Arrays"], "");
    expect(result).toEqual(["Arrays"]);
  });
});

describe("XP constants", () => {
  it("xpPerPart is a positive integer", () => {
    expect(Number.isInteger(xpPerPart)).toBe(true);
    expect(xpPerPart).toBeGreaterThan(0);
  });
  it("XP_PER_CORRECT is a positive integer", () => {
    expect(Number.isInteger(XP_PER_CORRECT)).toBe(true);
    expect(XP_PER_CORRECT).toBeGreaterThan(0);
  });
});
