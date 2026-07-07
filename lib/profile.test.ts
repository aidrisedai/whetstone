import test from "node:test";
import assert from "node:assert/strict";
import { addConcept, defaultProfile, levelFromXp, levelProgress, XP_PER_CORRECT, xpPerPart } from "./profile.ts";

test("defaultProfile starts at zero with no concepts learned", () => {
  const p = defaultProfile();
  assert.equal(p.xp, 0);
  assert.equal(p.partsBuilt, 0);
  assert.deepEqual(p.conceptsLearned, []);
});

test("levelFromXp is 1-indexed and advances every 100 xp", () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(99), 1);
  assert.equal(levelFromXp(100), 2);
  assert.equal(levelFromXp(250), 3);
});

test("levelProgress reports 0..1 progress through the current level", () => {
  assert.equal(levelProgress(0), 0);
  assert.equal(levelProgress(50), 0.5);
  assert.equal(levelProgress(100), 0);
  assert.equal(levelProgress(175), 0.75);
});

test("addConcept dedupes and ignores blank/whitespace-only entries", () => {
  assert.deepEqual(addConcept([], "Loops"), ["Loops"]);
  assert.deepEqual(addConcept(["Loops"], "Loops"), ["Loops"]);
  assert.deepEqual(addConcept(["Loops"], "  "), ["Loops"]);
  assert.deepEqual(addConcept(["Loops"], "Arrays"), ["Loops", "Arrays"]);
});

test("xpPerPart and XP_PER_CORRECT are positive constants", () => {
  assert.equal(xpPerPart > 0, true);
  assert.equal(XP_PER_CORRECT > 0, true);
});
