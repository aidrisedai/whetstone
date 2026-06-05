import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "./format";
import type { CodeBeat } from "./types";

const beat = (code: string): CodeBeat => ({
  label: "l",
  lang: "html",
  code,
  say: "",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    expect(assembleBeats([beat("<a>"), beat("<b>"), beat("<c>")])).toBe("<a><b><c>");
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];
  it("returns first beat only at index 0", () => expect(assembleBeatsUpTo(beats, 0)).toBe("A"));
  it("returns all beats at last index", () => expect(assembleBeatsUpTo(beats, 2)).toBe("ABC"));
  it("returns middle slice", () => expect(assembleBeatsUpTo(beats, 1)).toBe("AB"));
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html><html lang="en"><head></head><body><p>hi</p></body></html>`;
  const validBeats = [beat(validHtml)];

  it("accepts a valid HTML document across beats", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });
  it("rejects empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("rejects a snippet without DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("rejects HTML missing closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
  it("rejects HTML missing <body>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("applyEdits", () => {
  const base = "<html><body>hello world</body></html>";

  it("replaces the first exact match", () => {
    const { code, applied } = applyEdits(base, [{ find: "hello world", replace: "goodbye" }]);
    expect(code).toBe("<html><body>goodbye</body></html>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "hello", replace: "hi" },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("<html><body>hi earth</body></html>");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "not-here", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips malformed edits with empty find", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("returns 0 applied for an empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("only replaces the FIRST occurrence (leaves duplicates intact)", () => {
    const src = "aXbXcX";
    const { code, applied } = applyEdits(src, [{ find: "X", replace: "!" }]);
    expect(code).toBe("a!bXcX");
    expect(applied).toBe(1);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html fence", () => {
    expect(cleanGeneratedHtml("```html\n<html></html>\n```")).toBe("<html></html>");
  });
  it("strips leading ``` fence (no language)", () => {
    expect(cleanGeneratedHtml("```\n<div></div>\n```")).toBe("<div></div>");
  });
  it("leaves clean HTML untouched", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });
  it("handles null/undefined gracefully (coerces to empty)", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});
