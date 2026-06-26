import { describe, expect, it } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "../lib/format";

const beat = (code: string) => ({
  code,
  label: "test",
  lang: "html" as const,
  say: "",
  isNew: false,
});

describe("assembleBeats", () => {
  it("returns empty string for no beats", () => expect(assembleBeats([])).toBe(""));
  it("returns the single beat's code", () => expect(assembleBeats([beat("<html>")])).toBe("<html>"));
  it("concatenates multiple beats in order", () =>
    expect(assembleBeats([beat("<head>"), beat("</head>")])).toBe("<head></head>"));
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("returns only the first beat for index 0", () =>
    expect(assembleBeatsUpTo(beats, 0)).toBe("A"));

  it("returns beats up to and including index", () =>
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB"));

  it("returns all beats for last index", () =>
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC"));
});

describe("beatsFormValidDoc", () => {
  const htmlDoc = (body: string) =>
    `<!DOCTYPE html><html><head></head><body>${body}</body></html>`;

  it("returns true for a valid HTML document", () =>
    expect(beatsFormValidDoc([beat(htmlDoc("<p>hi</p>"))])).toBe(true));

  it("returns false for empty beats", () =>
    expect(beatsFormValidDoc([])).toBe(false));

  it("returns false when DOCTYPE is missing", () =>
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false));

  it("returns false when </html> closing tag is missing", () =>
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false));

  it("returns false when <body is missing", () =>
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false));
});

describe("cleanGeneratedHtml", () => {
  it("strips a leading ```html fence and trailing ```", () => {
    const input = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("strips a generic ``` fence", () => {
    const input = "```\n<div></div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div></div>");
  });

  it("passes through clean HTML unchanged", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/undefined gracefully", () =>
    expect(cleanGeneratedHtml(null as unknown as string)).toBe(""));
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("<p>hello</p>", [
      { find: "hello", replace: "world" },
    ]);
    expect(code).toBe("<p>world</p>");
    expect(applied).toBe(1);
  });

  it("skips an edit whose find string is not present", () => {
    const { code, applied } = applyEdits("<p>hello</p>", [
      { find: "missing", replace: "world" },
    ]);
    expect(code).toBe("<p>hello</p>");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "x" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("applies only the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "hello", replace: "goodbye" },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("goodbye earth");
    expect(applied).toBe(2);
  });

  it("returns 0 applied for an empty edits array", () => {
    const { code, applied } = applyEdits("original", []);
    expect(code).toBe("original");
    expect(applied).toBe(0);
  });
});
