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
  it("returns a profile with empty name", () => {
    expect(defaultProfile().name).toBe("");
  });

  it("starts with 0 xp", () => {
    expect(defaultProfile().xp).toBe(0);
  });

  it("starts with empty conceptsLearned", () => {
    expect(defaultProfile().conceptsLearned).toEqual([]);
  });

  it("starts with 0 partsBuilt", () => {
    expect(defaultProfile().partsBuilt).toBe(0);
  });
});

describe("levelFromXp", () => {
  it("level 1 at 0 xp", () => expect(levelFromXp(0)).toBe(1));
  it("level 1 at 99 xp", () => expect(levelFromXp(99)).toBe(1));
  it("level 2 at 100 xp", () => expect(levelFromXp(100)).toBe(2));
  it("level 3 at 200 xp", () => expect(levelFromXp(200)).toBe(3));
  it("level 11 at 1000 xp", () => expect(levelFromXp(1000)).toBe(11));
});

describe("levelProgress", () => {
  it("0 progress at level start", () => expect(levelProgress(0)).toBe(0));
  it("0.5 at mid-level", () => expect(levelProgress(50)).toBe(0.5));
  it("resets to 0 on level up", () => expect(levelProgress(100)).toBe(0));
  it("0.25 at 25 xp into a level", () => expect(levelProgress(125)).toBe(0.25));
});

describe("addConcept", () => {
  it("adds a new concept", () => {
    expect(addConcept([], "loops")).toEqual(["loops"]);
  });

  it("does not duplicate existing concepts", () => {
    expect(addConcept(["loops"], "loops")).toEqual(["loops"]);
  });

  it("trims whitespace before adding", () => {
    expect(addConcept([], "  loops  ")).toEqual(["loops"]);
  });

  it("ignores empty string", () => {
    expect(addConcept(["loops"], "")).toEqual(["loops"]);
  });
});

describe("constants", () => {
  it("xpPerPart is 25", () => expect(xpPerPart).toBe(25));
  it("XP_PER_CORRECT is 10", () => expect(XP_PER_CORRECT).toBe(10));
});
