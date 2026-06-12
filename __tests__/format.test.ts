import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const makeBeat = (code: string, isNew = false): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "say",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [makeBeat("<!DOCTYPE html>"), makeBeat("<html>"), makeBeat("</html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><html></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles beats up to and including the given index", () => {
    const beats = [makeBeat("A"), makeBeat("B"), makeBeat("C")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    makeBeat("<!DOCTYPE html><html><head></head>"),
    makeBeat("<body>content</body></html>"),
  ];

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([makeBeat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing html tag is missing", () => {
    expect(beatsFormValidDoc([makeBeat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when body tag is missing", () => {
    expect(beatsFormValidDoc([makeBeat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });

  it("strips plain code fences", () => {
    expect(cleanGeneratedHtml("```\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });

  it("leaves clean HTML unchanged", () => {
    expect(cleanGeneratedHtml("<div>hi</div>")).toBe("<div>hi</div>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });

  it("trims leading/trailing whitespace", () => {
    expect(cleanGeneratedHtml("  <div>hi</div>  ")).toBe("<div>hi</div>");
  });
});

describe("applyEdits", () => {
  const code = `<div id="title">Hello World</div>\n<p class="body">Some text</p>`;

  it("applies a single find-and-replace edit", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello World", replace: "Hi There" },
    ]);
    expect(out).toContain("Hi There");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello World", replace: "Hi There" },
      { find: "Some text", replace: "Other text" },
    ]);
    expect(out).toContain("Hi There");
    expect(out).toContain("Other text");
    expect(applied).toBe(2);
  });

  it("returns applied=0 when nothing matches", () => {
    const { applied } = applyEdits(code, [{ find: "not present", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const repeated = "A B A B";
    const { code: out } = applyEdits(repeated, [{ find: "A", replace: "Z" }]);
    expect(out).toBe("Z B A B");
  });

  it("skips invalid edits gracefully", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "", replace: "bad" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(out).toBe(code); // unchanged
    expect(applied).toBe(0);
  });
});
