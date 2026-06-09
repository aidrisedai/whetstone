import { describe, it, expect } from "vitest";
import {
  levelFromXp,
  levelProgress,
  addConcept,
  defaultProfile,
  XP_PER_CORRECT,
  xpPerPart,
} from "../profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("advances to level 2 at 100 XP", () => {
    expect(levelFromXp(100)).toBe(2);
  });

  it("advances to level 3 at 200 XP", () => {
    expect(levelFromXp(200)).toBe(3);
  });

  it("stays in a level until the next threshold", () => {
    expect(levelFromXp(50)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(150)).toBe(2);
  });
});

describe("levelProgress", () => {
  it("returns 0 at the start of a level", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });

  it("returns 0.5 at the halfway point", () => {
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(150)).toBe(0.5);
  });

  it("returns close to 1 just before level up", () => {
    expect(levelProgress(99)).toBeCloseTo(0.99);
  });
});

describe("addConcept", () => {
  it("adds a new concept to the list", () => {
    expect(addConcept([], "event listeners")).toEqual(["event listeners"]);
    expect(addConcept(["arrays"], "functions")).toEqual(["arrays", "functions"]);
  });

  it("does not duplicate an existing concept", () => {
    expect(addConcept(["arrays"], "arrays")).toEqual(["arrays"]);
  });

  it("trims whitespace before adding", () => {
    expect(addConcept([], "  loops  ")).toEqual(["loops"]);
  });

  it("ignores empty or whitespace-only strings", () => {
    expect(addConcept(["arrays"], "")).toEqual(["arrays"]);
    expect(addConcept(["arrays"], "   ")).toEqual(["arrays"]);
  });
});

describe("defaultProfile", () => {
  it("initializes with zeroed-out stats", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.name).toBe("");
    expect(p.favoriteGame).toBe("");
  });

  it("sets createdAt to a recent timestamp", () => {
    const before = Date.now();
    const p = defaultProfile();
    const after = Date.now();
    expect(p.createdAt).toBeGreaterThanOrEqual(before);
    expect(p.createdAt).toBeLessThanOrEqual(after);
  });
});

describe("constants", () => {
  it("XP_PER_CORRECT is 10", () => {
    expect(XP_PER_CORRECT).toBe(10);
  });

  it("xpPerPart is 25", () => {
    expect(xpPerPart).toBe(25);
  });
});
