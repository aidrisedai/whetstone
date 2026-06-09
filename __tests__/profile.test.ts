import { describe, it, expect } from "vitest";
import {
  defaultProfile,
  levelFromXp,
  levelProgress,
  addConcept,
  xpPerPart,
} from "@/lib/profile";

describe("defaultProfile", () => {
  it("returns a zeroed-out profile", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
    expect(typeof p.createdAt).toBe("number");
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("advances level every 100 XP", () => {
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
    expect(levelFromXp(350)).toBe(4);
  });

  it("does not advance mid-level", () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(199)).toBe(2);
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

  it("stays between 0 and 1", () => {
    for (const xp of [0, 1, 50, 99, 100, 101, 250, 999]) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});

describe("addConcept", () => {
  it("adds a new concept to the list", () => {
    const result = addConcept(["Arrays"], "Loops");
    expect(result).toContain("Loops");
    expect(result).toContain("Arrays");
  });

  it("does not add duplicate concepts", () => {
    const result = addConcept(["Arrays", "Loops"], "Arrays");
    expect(result.filter((c) => c === "Arrays")).toHaveLength(1);
  });

  it("trims and ignores empty strings", () => {
    const result = addConcept(["Arrays"], "  ");
    expect(result).toEqual(["Arrays"]);
  });

  it("does not mutate the original list", () => {
    const original = ["Arrays"];
    const result = addConcept(original, "Loops");
    expect(original).toEqual(["Arrays"]);
    expect(result).toEqual(["Arrays", "Loops"]);
  });
});

describe("xpPerPart", () => {
  it("is 25", () => {
    expect(xpPerPart).toBe(25);
  });
});
