import { describe, expect, it } from "vitest";
import { addConcept, levelFromXp, levelProgress } from "../profile";

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => expect(levelFromXp(0)).toBe(1));
  it("reaches level 2 at 100 XP", () => expect(levelFromXp(100)).toBe(2));
  it("reaches level 3 at 200 XP", () => expect(levelFromXp(200)).toBe(3));
  it("stays at level 2 at 199 XP", () => expect(levelFromXp(199)).toBe(2));
});

describe("levelProgress", () => {
  it("returns 0 at the start of a level", () => expect(levelProgress(0)).toBe(0));
  it("returns 0.5 halfway through a level", () => expect(levelProgress(50)).toBe(0.5));
  it("returns 0 at the exact start of the next level", () => expect(levelProgress(100)).toBe(0));
  it("returns 0.75 at 175 XP (75% through level 2)", () => expect(levelProgress(175)).toBe(0.75));
});

describe("addConcept", () => {
  it("adds a new concept to the list", () => {
    expect(addConcept([], "Event delegation")).toEqual(["Event delegation"]);
  });

  it("does not add a duplicate concept", () => {
    const list = ["Event delegation", "State + render"];
    expect(addConcept(list, "Event delegation")).toEqual(list);
  });

  it("ignores whitespace-only concept", () => {
    expect(addConcept(["a"], "   ")).toEqual(["a"]);
  });

  it("trims concept before comparing", () => {
    const list = ["Event delegation"];
    expect(addConcept(list, "  Event delegation  ")).toEqual(list);
  });

  it("preserves existing list order when adding", () => {
    const list = ["a", "b"];
    expect(addConcept(list, "c")).toEqual(["a", "b", "c"]);
  });
});
