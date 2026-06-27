import { describe, it, expect } from "vitest";
import { levelFromXp, levelProgress, addConcept, defaultProfile } from "../lib/profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => expect(levelFromXp(0)).toBe(1));
  it("stays at level 1 below 100 XP", () => expect(levelFromXp(99)).toBe(1));
  it("reaches level 2 at exactly 100 XP", () => expect(levelFromXp(100)).toBe(2));
  it("handles large XP values", () => expect(levelFromXp(500)).toBe(6));
});

describe("levelProgress", () => {
  it("returns 0 at level start", () => expect(levelProgress(0)).toBe(0));
  it("returns 0.5 halfway through a level", () => expect(levelProgress(50)).toBe(0.5));
  it("resets to 0 at exact level boundary", () => expect(levelProgress(100)).toBe(0));
  it("returns 0.25 at 25 XP into a level", () => expect(levelProgress(125)).toBe(0.25));
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    const result = addConcept(["loops"], "DOM");
    expect(result).toEqual(["loops", "DOM"]);
  });

  it("does not duplicate an existing concept", () => {
    const result = addConcept(["loops", "DOM"], "loops");
    expect(result).toEqual(["loops", "DOM"]);
  });

  it("ignores empty string", () => {
    const result = addConcept(["loops"], "");
    expect(result).toEqual(["loops"]);
  });

  it("trims whitespace before comparing", () => {
    const result = addConcept(["loops"], "  loops  ");
    expect(result).toEqual(["loops"]);
  });

  it("starts from empty list", () => {
    const result = addConcept([], "arrays");
    expect(result).toEqual(["arrays"]);
  });
});

describe("defaultProfile", () => {
  it("has zero XP", () => expect(defaultProfile().xp).toBe(0));
  it("has empty concepts list", () => expect(defaultProfile().conceptsLearned).toEqual([]));
  it("has level 1 implied (0 XP)", () => expect(levelFromXp(defaultProfile().xp)).toBe(1));
});
