import { describe, it, expect } from "vitest";
import {
  addConcept,
  defaultProfile,
  levelFromXp,
  levelProgress,
  XP_PER_CORRECT,
} from "@/lib/profile";

describe("defaultProfile", () => {
  it("returns zeroed profile", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
    expect(p.name).toBe("");
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with 0 xp", () => {
    expect(levelFromXp(0)).toBe(1);
  });
  it("advances to level 2 at 100 xp", () => {
    expect(levelFromXp(100)).toBe(2);
  });
  it("advances to level 3 at 200 xp", () => {
    expect(levelFromXp(200)).toBe(3);
  });
  it("handles mid-level xp", () => {
    expect(levelFromXp(150)).toBe(2);
  });
});

describe("levelProgress", () => {
  it("is 0 at level boundary", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });
  it("is 0.5 halfway through a level", () => {
    expect(levelProgress(50)).toBe(0.5);
  });
  it("is 0.75 at 75 xp into a level", () => {
    expect(levelProgress(175)).toBe(0.75);
  });
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    expect(addConcept([], "Loops")).toEqual(["Loops"]);
  });
  it("does not duplicate existing concepts", () => {
    expect(addConcept(["Loops"], "Loops")).toEqual(["Loops"]);
  });
  it("trims whitespace before checking", () => {
    expect(addConcept(["Loops"], "  Loops  ")).toEqual(["Loops"]);
  });
  it("ignores empty strings", () => {
    expect(addConcept(["Loops"], "")).toEqual(["Loops"]);
    expect(addConcept(["Loops"], "   ")).toEqual(["Loops"]);
  });
  it("preserves existing list order", () => {
    const result = addConcept(["A", "B"], "C");
    expect(result).toEqual(["A", "B", "C"]);
  });
});

describe("XP_PER_CORRECT", () => {
  it("is a positive number", () => {
    expect(XP_PER_CORRECT).toBeGreaterThan(0);
  });
});
