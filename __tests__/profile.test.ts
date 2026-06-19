import { describe, it, expect } from "vitest";
import { levelFromXp, levelProgress, addConcept, defaultProfile, XP_PER_CORRECT } from "@/lib/profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => expect(levelFromXp(0)).toBe(1));
  it("stays at level 1 below 100 XP", () => expect(levelFromXp(99)).toBe(1));
  it("reaches level 2 at exactly 100 XP", () => expect(levelFromXp(100)).toBe(2));
  it("reaches level 3 at 200 XP", () => expect(levelFromXp(200)).toBe(3));
  it("handles large XP values", () => expect(levelFromXp(1000)).toBe(11));
});

describe("levelProgress", () => {
  it("returns 0 at the start of a level", () => expect(levelProgress(0)).toBe(0));
  it("returns 0.5 at the midpoint of a level", () => expect(levelProgress(50)).toBe(0.5));
  it("returns 0 at exactly the next level threshold", () => expect(levelProgress(100)).toBe(0));
  it("returns 0.25 at 25 XP into a level", () => expect(levelProgress(125)).toBe(0.25));
});

describe("addConcept", () => {
  it("adds a new concept to the list", () => {
    expect(addConcept(["arrays"], "loops")).toEqual(["arrays", "loops"]);
  });
  it("does not add a duplicate concept", () => {
    expect(addConcept(["arrays", "loops"], "loops")).toEqual(["arrays", "loops"]);
  });
  it("does not add an empty string", () => {
    expect(addConcept(["arrays"], "")).toEqual(["arrays"]);
  });
  it("trims whitespace before deduplication check", () => {
    expect(addConcept(["loops"], "  loops  ")).toEqual(["loops"]);
  });
  it("starts from an empty list", () => {
    expect(addConcept([], "closures")).toEqual(["closures"]);
  });
});

describe("defaultProfile", () => {
  it("returns a profile with zeroed XP and counts", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
  });
  it("returns a profile with empty name and game", () => {
    const p = defaultProfile();
    expect(p.name).toBe("");
    expect(p.favoriteGame).toBe("");
  });
  it("stamps a createdAt timestamp", () => {
    const before = Date.now();
    const p = defaultProfile();
    expect(p.createdAt).toBeGreaterThanOrEqual(before);
  });
});

describe("XP_PER_CORRECT", () => {
  it("is a positive number", () => {
    expect(XP_PER_CORRECT).toBeGreaterThan(0);
  });
});
