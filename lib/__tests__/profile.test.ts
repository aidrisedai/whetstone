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
});

describe("levelFromXp", () => {
  it("starts at level 1", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
  });

  it("advances level at 100 XP increments", () => {
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
    expect(levelFromXp(250)).toBe(3);
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

  it("approaches 1 near the end of a level", () => {
    expect(levelProgress(99)).toBeCloseTo(0.99);
  });
});

describe("addConcept", () => {
  it("appends a new concept", () => {
    expect(addConcept([], "variables")).toEqual(["variables"]);
    expect(addConcept(["variables"], "functions")).toEqual(["variables", "functions"]);
  });

  it("does not duplicate existing concepts", () => {
    expect(addConcept(["variables"], "variables")).toEqual(["variables"]);
  });

  it("trims the concept", () => {
    expect(addConcept([], "  loops  ")).toEqual(["loops"]);
  });

  it("ignores empty string", () => {
    expect(addConcept(["variables"], "")).toEqual(["variables"]);
    expect(addConcept(["variables"], "   ")).toEqual(["variables"]);
  });
});

describe("constants", () => {
  it("xpPerPart is a positive integer", () => {
    expect(typeof xpPerPart).toBe("number");
    expect(xpPerPart).toBeGreaterThan(0);
    expect(Number.isInteger(xpPerPart)).toBe(true);
  });

  it("XP_PER_CORRECT is a positive integer", () => {
    expect(typeof XP_PER_CORRECT).toBe("number");
    expect(XP_PER_CORRECT).toBeGreaterThan(0);
  });
});
