import { describe, it, expect } from "vitest";
import { levelFromXp, levelProgress, addConcept } from "./profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("levels up every 100 XP", () => {
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(101)).toBe(2);
  });
});

describe("levelProgress", () => {
  it("returns 0 at the start of a level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });

  it("returns fraction of progress through current level", () => {
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(175)).toBe(0.75);
  });
});

describe("addConcept", () => {
  it("adds a new concept to the list", () => {
    expect(addConcept([], "event listeners")).toEqual(["event listeners"]);
  });

  it("does not add duplicates", () => {
    const list = ["event listeners"];
    expect(addConcept(list, "event listeners")).toEqual(["event listeners"]);
  });

  it("trims whitespace before adding", () => {
    expect(addConcept([], "  closures  ")).toEqual(["closures"]);
  });

  it("ignores blank strings", () => {
    expect(addConcept(["a"], "   ")).toEqual(["a"]);
  });
});
