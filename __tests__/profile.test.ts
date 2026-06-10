import { describe, it, expect } from "vitest";
import {
  addConcept,
  levelFromXp,
  levelProgress,
  defaultProfile,
} from "@/lib/profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });
  it("advances level every 100 XP", () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(200)).toBe(3);
    expect(levelFromXp(250)).toBe(3);
  });
});

describe("levelProgress", () => {
  it("returns 0 at level start", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
  });
  it("returns 0.5 at midpoint", () => {
    expect(levelProgress(50)).toBe(0.5);
    expect(levelProgress(150)).toBe(0.5);
  });
  it("returns value in [0, 1)", () => {
    for (const xp of [0, 25, 50, 75, 99, 100, 199]) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});

describe("addConcept", () => {
  it("adds new concepts", () => {
    expect(addConcept([], "Event delegation")).toEqual(["Event delegation"]);
    expect(addConcept(["a"], "b")).toEqual(["a", "b"]);
  });
  it("does not duplicate existing concepts", () => {
    expect(addConcept(["a", "b"], "a")).toEqual(["a", "b"]);
  });
  it("ignores empty strings", () => {
    expect(addConcept(["a"], "")).toEqual(["a"]);
    expect(addConcept(["a"], "   ")).toEqual(["a"]);
  });
});

describe("defaultProfile", () => {
  it("has sensible zero state", () => {
    const p = defaultProfile();
    expect(p.xp).toBe(0);
    expect(p.conceptsLearned).toEqual([]);
    expect(p.partsBuilt).toBe(0);
    expect(p.projectsBuilt).toBe(0);
    expect(p.quizzesAced).toBe(0);
    expect(p.name).toBe("");
    expect(p.favoriteGame).toBe("");
    expect(p.createdAt).toBeGreaterThan(0);
  });
});
