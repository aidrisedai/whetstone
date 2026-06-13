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
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("advances to level 2 at 100 XP", () => {
    expect(levelFromXp(100)).toBe(2);
  });

  it("advances to level 3 at 200 XP", () => {
    expect(levelFromXp(200)).toBe(3);
  });

  it("does not advance before 100 XP", () => {
    expect(levelFromXp(99)).toBe(1);
  });
});

describe("levelProgress", () => {
  it("is 0 at the start of a level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });

  it("is 0.5 halfway through a level", () => {
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(150)).toBe(0.5);
  });

  it("approaches 1 near the end of a level", () => {
    expect(levelProgress(99)).toBeCloseTo(0.99);
  });
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    const result = addConcept(["Loops"], "Functions");
    expect(result).toContain("Functions");
  });

  it("does not duplicate an existing concept", () => {
    const result = addConcept(["Loops", "Functions"], "Loops");
    expect(result.filter((c) => c === "Loops").length).toBe(1);
  });

  it("trims whitespace", () => {
    const result = addConcept([], "  State management  ");
    expect(result).toContain("State management");
  });

  it("ignores empty string", () => {
    const result = addConcept(["Loops"], "");
    expect(result).toEqual(["Loops"]);
  });

  it("returns the same array reference when concept already exists", () => {
    const original = ["Loops"];
    const result = addConcept(original, "Loops");
    expect(result).toBe(original);
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
