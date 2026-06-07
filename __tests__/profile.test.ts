import { describe, it, expect } from "vitest";
import {
  levelFromXp,
  levelProgress,
  addConcept,
  defaultProfile,
  XP_PER_CORRECT,
  xpPerPart,
} from "../lib/profile";

// ---------------------------------------------------------------------------
// constants
// ---------------------------------------------------------------------------
describe("XP constants", () => {
  it("XP_PER_CORRECT is a positive number", () => {
    expect(XP_PER_CORRECT).toBeGreaterThan(0);
  });

  it("xpPerPart is a positive number", () => {
    expect(xpPerPart).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// defaultProfile
// ---------------------------------------------------------------------------
describe("defaultProfile", () => {
  it("returns a profile with zero XP and empty arrays", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
  });

  it("sets a createdAt timestamp", () => {
    const before = Date.now();
    const p = defaultProfile();
    const after = Date.now();
    expect(p.createdAt).toBeGreaterThanOrEqual(before);
    expect(p.createdAt).toBeLessThanOrEqual(after);
  });

  it("returns a new object each call", () => {
    expect(defaultProfile()).not.toBe(defaultProfile());
  });
});

// ---------------------------------------------------------------------------
// levelFromXp
// ---------------------------------------------------------------------------
describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("stays at level 1 until 100 XP (exclusive)", () => {
    expect(levelFromXp(99)).toBe(1);
  });

  it("advances to level 2 at exactly 100 XP", () => {
    expect(levelFromXp(100)).toBe(2);
  });

  it("advances to level 3 at 200 XP", () => {
    expect(levelFromXp(200)).toBe(3);
  });

  it("handles large XP values", () => {
    expect(levelFromXp(1000)).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// levelProgress
// ---------------------------------------------------------------------------
describe("levelProgress", () => {
  it("returns 0 at the start of a level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });

  it("returns 0.5 at the midpoint of a level", () => {
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(150)).toBe(0.5);
  });

  it("returns a value in [0, 1)", () => {
    for (const xp of [0, 1, 50, 99, 100, 199, 250]) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});

// ---------------------------------------------------------------------------
// addConcept
// ---------------------------------------------------------------------------
describe("addConcept", () => {
  it("adds a new concept to the list", () => {
    expect(addConcept([], "loops")).toEqual(["loops"]);
  });

  it("does not add a duplicate", () => {
    expect(addConcept(["loops"], "loops")).toEqual(["loops"]);
  });

  it("trims whitespace before comparing/adding", () => {
    const result = addConcept(["loops"], "  loops  ");
    expect(result).toEqual(["loops"]); // trimmed to "loops", already exists
  });

  it("does not add an empty/whitespace-only concept", () => {
    expect(addConcept(["loops"], "")).toEqual(["loops"]);
    expect(addConcept(["loops"], "   ")).toEqual(["loops"]);
  });

  it("preserves existing concepts in order", () => {
    const result = addConcept(["a", "b"], "c");
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("returns a new array (immutable)", () => {
    const original = ["a"];
    const result = addConcept(original, "b");
    expect(result).not.toBe(original);
  });
});
