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
  it("starts with zero XP and empty arrays", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
  });

  it("has a non-zero createdAt timestamp", () => {
    expect(defaultProfile().createdAt).toBeGreaterThan(0);
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => expect(levelFromXp(0)).toBe(1));
  it("reaches level 2 at 100 XP", () => expect(levelFromXp(100)).toBe(2));
  it("reaches level 3 at 200 XP", () => expect(levelFromXp(200)).toBe(3));
  it("handles non-round XP values", () => expect(levelFromXp(150)).toBe(2));
});

describe("levelProgress", () => {
  it("returns 0 at 0 XP", () => expect(levelProgress(0)).toBe(0));
  it("returns 0.5 at 50 XP", () => expect(levelProgress(50)).toBe(0.5));
  it("returns 0 again at the start of a new level", () => expect(levelProgress(100)).toBe(0));
  it("returns a value in [0, 1)", () => {
    const p = levelProgress(175);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThan(1);
  });
});

describe("addConcept", () => {
  it("adds a new concept to the list", () => {
    expect(addConcept(["DOM"], "Loops")).toEqual(["DOM", "Loops"]);
  });

  it("does not add duplicates", () => {
    expect(addConcept(["DOM", "Loops"], "DOM")).toEqual(["DOM", "Loops"]);
  });

  it("ignores empty concept strings", () => {
    expect(addConcept(["DOM"], "  ")).toEqual(["DOM"]);
  });

  it("works on an empty list", () => {
    expect(addConcept([], "State")).toEqual(["State"]);
  });
});

describe("xp constants", () => {
  it("xpPerPart is a positive number", () => expect(xpPerPart).toBeGreaterThan(0));
  it("XP_PER_CORRECT is a positive number", () => expect(XP_PER_CORRECT).toBeGreaterThan(0));
});
