import test from "node:test";
import assert from "node:assert/strict";
import { applyEdits, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml } from "./format.ts";
import type { CodeBeat } from "./types.ts";

function beat(code: string): CodeBeat {
  return { label: "l", lang: "html", code, say: "s", isNew: true };
}

test("assembleBeats concatenates code in order", () => {
  assert.equal(assembleBeats([beat("a"), beat("b"), beat("c")]), "abc");
  assert.equal(assembleBeats([]), "");
});

test("assembleBeatsUpTo stops after the given index (inclusive)", () => {
  const beats = [beat("a"), beat("b"), beat("c")];
  assert.equal(assembleBeatsUpTo(beats, 0), "a");
  assert.equal(assembleBeatsUpTo(beats, 1), "ab");
  assert.equal(assembleBeatsUpTo(beats, 2), "abc");
});

test("beatsFormValidDoc requires doctype, a body tag, and a closing html tag", () => {
  const valid = [beat("<!DOCTYPE html>\n<html><body>"), beat("hi</body></html>")];
  assert.equal(beatsFormValidDoc(valid), true);

  const noDoctype = [beat("<html><body>hi</body></html>")];
  assert.equal(beatsFormValidDoc(noDoctype), false);

  const unclosed = [beat("<!DOCTYPE html><html><body>hi")];
  assert.equal(beatsFormValidDoc(unclosed), false);

  assert.equal(beatsFormValidDoc([]), false);
});

test("cleanGeneratedHtml strips a leading/trailing markdown code fence", () => {
  assert.equal(cleanGeneratedHtml("```html\n<p>hi</p>\n```"), "<p>hi</p>");
  assert.equal(cleanGeneratedHtml("<p>hi</p>"), "<p>hi</p>");
  assert.equal(cleanGeneratedHtml("  <p>hi</p>  "), "<p>hi</p>");
});

test("applyEdits replaces the first exact match for each edit and counts hits", () => {
  const { code, applied } = applyEdits("<body><h1>Old</h1></body>", [
    { find: "<h1>Old</h1>", replace: "<h1>New</h1>" },
  ]);
  assert.equal(code, "<body><h1>New</h1></body>");
  assert.equal(applied, 1);
});

test("applyEdits skips edits whose find text is not present, without touching the code", () => {
  const { code, applied } = applyEdits("<p>hi</p>", [{ find: "<p>missing</p>", replace: "<p>x</p>" }]);
  assert.equal(code, "<p>hi</p>");
  assert.equal(applied, 0);
});

test("applyEdits ignores malformed edit entries", () => {
  const { code, applied } = applyEdits("abc", [
    { find: "", replace: "x" },
    { find: "a", replace: "z" },
  ]);
  assert.equal(code, "zbc");
  assert.equal(applied, 1);
});
