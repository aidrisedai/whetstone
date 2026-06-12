import { describe, it, expect } from "vitest";
import {
  levelFromXp,
  levelProgress,
  addConcept,
  defaultProfile,
  XP_PER_CORRECT,
} from "../lib/profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("advances to level 2 at 100 XP", () => {
    expect(levelFromXp(100)).toBe(2);
  });

  it("stays at level 1 just below the threshold", () => {
    expect(levelFromXp(99)).toBe(1);
  });

  it("computes higher levels correctly", () => {
    expect(levelFromXp(300)).toBe(4);
    expect(levelFromXp(500)).toBe(6);
  });
});

describe("levelProgress", () => {
  it("returns 0 at the start of a level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });

  it("returns 0.5 at the midpoint of a level", () => {
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(150)).toBe(0.5);
  });

  it("returns values between 0 and 1 exclusive", () => {
    const p = levelProgress(75);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe("addConcept", () => {
  it("adds a new concept to an empty list", () => {
    expect(addConcept([], "localStorage")).toEqual(["localStorage"]);
  });

  it("does not add duplicates", () => {
    const list = ["localStorage"];
    expect(addConcept(list, "localStorage")).toEqual(["localStorage"]);
  });

  it("trims whitespace before adding", () => {
    expect(addConcept([], "  arrays  ")).toEqual(["arrays"]);
  });

  it("ignores empty or whitespace-only strings", () => {
    expect(addConcept(["x"], "")).toEqual(["x"]);
    expect(addConcept(["x"], "  ")).toEqual(["x"]);
  });

  it("preserves existing order and appends to the end", () => {
    const result = addConcept(["arrays", "loops"], "functions");
    expect(result).toEqual(["arrays", "loops", "functions"]);
  });
});

describe("defaultProfile", () => {
  it("creates a profile with zeroed stats", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
  });

  it("stamps a creation timestamp", () => {
    const before = Date.now();
    const p = defaultProfile();
    const after = Date.now();
    expect(p.createdAt).toBeGreaterThanOrEqual(before);
    expect(p.createdAt).toBeLessThanOrEqual(after);
  });
});

describe("XP_PER_CORRECT", () => {
  it("is a positive number", () => {
    expect(XP_PER_CORRECT).toBeGreaterThan(0);
  });
});
