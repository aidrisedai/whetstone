import { describe, it, expect } from "vitest";
import { levelFromXp, levelProgress, addConcept, defaultProfile } from "@/lib/profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => expect(levelFromXp(0)).toBe(1));
  it("advances to level 2 at 100 XP", () => expect(levelFromXp(100)).toBe(2));
  it("advances to level 3 at 200 XP", () => expect(levelFromXp(200)).toBe(3));
  it("handles mid-level XP", () => expect(levelFromXp(150)).toBe(2));
});

describe("levelProgress", () => {
  it("returns 0 at the start of a level", () => expect(levelProgress(0)).toBe(0));
  it("returns 0.5 at half of a level", () => expect(levelProgress(50)).toBe(0.5));
  it("returns 0 at the start of a new level (XP = multiple of 100)", () => {
    expect(levelProgress(100)).toBe(0);
  });
  it("returns 0.75 at 75% through a level", () => expect(levelProgress(75)).toBe(0.75));
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    expect(addConcept([], "loops")).toEqual(["loops"]);
  });
  it("does not duplicate an existing concept", () => {
    expect(addConcept(["loops"], "loops")).toEqual(["loops"]);
  });
  it("trims whitespace before adding", () => {
    expect(addConcept([], "  arrays  ")).toEqual(["arrays"]);
  });
  it("ignores an empty concept", () => {
    expect(addConcept(["loops"], "  ")).toEqual(["loops"]);
  });
  it("appends after existing concepts", () => {
    expect(addConcept(["loops"], "functions")).toEqual(["loops", "functions"]);
  });
});

describe("defaultProfile", () => {
  it("initializes with zeroed numeric fields", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
  });
  it("initializes with empty strings for name and favoriteGame", () => {
    const p = defaultProfile();
    expect(p.name).toBe("");
    expect(p.favoriteGame).toBe("");
  });
  it("initializes conceptsLearned as empty array", () => {
    expect(defaultProfile().conceptsLearned).toEqual([]);
  });
});
