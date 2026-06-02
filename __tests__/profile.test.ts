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
  it("has zero XP", () => expect(defaultProfile().xp).toBe(0));
  it("has empty name", () => expect(defaultProfile().name).toBe(""));
  it("has empty concepts list", () => expect(defaultProfile().conceptsLearned).toEqual([]));
  it("sets createdAt to a reasonable timestamp", () => {
    const before = Date.now();
    const p = defaultProfile();
    expect(p.createdAt).toBeGreaterThanOrEqual(before);
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => expect(levelFromXp(0)).toBe(1));
  it("hits level 2 at 100 XP", () => expect(levelFromXp(100)).toBe(2));
  it("hits level 3 at 200 XP", () => expect(levelFromXp(200)).toBe(3));
  it("stays at level 1 just below threshold", () => expect(levelFromXp(99)).toBe(1));
  it("increases with large XP", () => expect(levelFromXp(500)).toBe(6));
});

describe("levelProgress", () => {
  it("returns 0 at start of a level", () => expect(levelProgress(0)).toBe(0));
  it("returns 0 at exact level boundary", () => expect(levelProgress(100)).toBe(0));
  it("returns 0.5 halfway through a level", () => expect(levelProgress(50)).toBe(0.5));
  it("returns 0.25 at 25 XP", () => expect(levelProgress(25)).toBe(0.25));
  it("stays in 0..1 range", () => {
    for (const xp of [0, 50, 99, 100, 150, 250]) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});

describe("addConcept", () => {
  it("adds a new concept to the list", () => {
    expect(addConcept([], "Loops")).toEqual(["Loops"]);
  });

  it("does not add duplicates", () => {
    expect(addConcept(["Loops"], "Loops")).toEqual(["Loops"]);
  });

  it("appends to an existing list", () => {
    expect(addConcept(["Loops"], "State")).toEqual(["Loops", "State"]);
  });

  it("ignores empty-string concept", () => {
    expect(addConcept(["Loops"], "  ")).toEqual(["Loops"]);
  });

  it("does not mutate the input list", () => {
    const original = ["Loops"];
    addConcept(original, "State");
    expect(original).toEqual(["Loops"]);
  });
});

describe("XP constants", () => {
  it("xpPerPart is positive", () => expect(xpPerPart).toBeGreaterThan(0));
  it("XP_PER_CORRECT is positive", () => expect(XP_PER_CORRECT).toBeGreaterThan(0));
});
