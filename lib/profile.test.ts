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
  it("returns a profile with zero XP and empty fields", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.name).toBe("");
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("advances a level every 100 XP", () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
  });

  it("handles large XP values", () => {
    expect(levelFromXp(1000)).toBe(11);
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

  it("approaches 1 just before the next level", () => {
    expect(levelProgress(99)).toBeCloseTo(0.99);
  });
});

describe("addConcept", () => {
  it("appends a new concept", () => {
    expect(addConcept([], "Arrays")).toEqual(["Arrays"]);
    expect(addConcept(["Arrays"], "Loops")).toEqual(["Arrays", "Loops"]);
  });

  it("does not duplicate an existing concept", () => {
    expect(addConcept(["Arrays"], "Arrays")).toEqual(["Arrays"]);
  });

  it("ignores blank concepts", () => {
    expect(addConcept(["Arrays"], "  ")).toEqual(["Arrays"]);
    expect(addConcept(["Arrays"], "")).toEqual(["Arrays"]);
  });
});

describe("constants", () => {
  it("xpPerPart is a positive integer", () => {
    expect(xpPerPart).toBeGreaterThan(0);
    expect(Number.isInteger(xpPerPart)).toBe(true);
  });

  it("XP_PER_CORRECT is a positive integer", () => {
    expect(XP_PER_CORRECT).toBeGreaterThan(0);
    expect(Number.isInteger(XP_PER_CORRECT)).toBe(true);
  });
});
