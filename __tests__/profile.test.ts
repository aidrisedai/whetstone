import { describe, it, expect } from "vitest";
import { levelFromXp, levelProgress, addConcept } from "@/lib/profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("advances to level 2 at 100 XP", () => {
    expect(levelFromXp(100)).toBe(2);
  });

  it("advances by one level per 100 XP", () => {
    expect(levelFromXp(200)).toBe(3);
    expect(levelFromXp(300)).toBe(4);
  });

  it("stays within the current level below the threshold", () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(199)).toBe(2);
  });
});

describe("levelProgress", () => {
  it("is 0 at the start of a level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });

  it("is 0.5 at the midpoint of a level", () => {
    expect(levelProgress(50)).toBeCloseTo(0.5);
    expect(levelProgress(150)).toBeCloseTo(0.5);
  });

  it("is 0.99 just before the next level", () => {
    expect(levelProgress(99)).toBeCloseTo(0.99);
  });
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    expect(addConcept([], "Event listeners")).toEqual(["Event listeners"]);
    expect(addConcept(["Loops"], "localStorage")).toEqual(["Loops", "localStorage"]);
  });

  it("does not add duplicates", () => {
    expect(addConcept(["Loops"], "Loops")).toEqual(["Loops"]);
  });

  it("ignores empty or whitespace strings", () => {
    expect(addConcept(["Loops"], "")).toEqual(["Loops"]);
    expect(addConcept(["Loops"], "   ")).toEqual(["Loops"]);
  });

  it("returns the original array reference when nothing changes", () => {
    const list = ["Loops"];
    expect(addConcept(list, "Loops")).toBe(list);
  });
});
