import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  applyEdits,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  uid,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "narration",
  isNew: true,
});

describe("uid", () => {
  it("generates unique ids", () => {
    const a = uid("m");
    const b = uid("m");
    expect(a).not.toBe(b);
  });

  it("uses provided prefix", () => {
    expect(uid("part")).toMatch(/^part_/);
  });

  it("defaults to m prefix", () => {
    expect(uid()).toMatch(/^m_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</html>")];
    expect(assembleBeats(beats)).toBe("<html><body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles only beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing html tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when body tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE", () => {
    const doc = `<!doctype html><html><body></body></html>`;
    expect(beatsFormValidDoc([beat(doc)])).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading code fence", () => {
    expect(cleanGeneratedHtml("```html\n<html></html>")).toBe("<html></html>");
  });

  it("strips trailing code fence", () => {
    expect(cleanGeneratedHtml("<html></html>\n```")).toBe("<html></html>");
  });

  it("strips both fences", () => {
    expect(cleanGeneratedHtml("```html\n<html></html>\n```")).toBe("<html></html>");
  });

  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<html></html>")).toBe("<html></html>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("trims whitespace", () => {
    expect(cleanGeneratedHtml("  <html></html>  ")).toBe("<html></html>");
  });
});

describe("applyEdits", () => {
  const base = "Hello, world! Hello again.";

  it("applies a single find-and-replace on first match", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toBe("Hi, world! Hello again.");
    expect(applied).toBe(1);
  });

  it("applies multiple edits sequentially", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello,", replace: "Hey," },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("Hey, earth! Hello again.");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "notfound", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips null/malformed edit entries", () => {
    const { code, applied } = applyEdits(base, [
      null as unknown as { find: string; replace: string },
      { find: "Hello", replace: "Hi" },
    ]);
    expect(code).toBe("Hi, world! Hello again.");
    expect(applied).toBe(1);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("AAA", [{ find: "A", replace: "B" }]);
    expect(code).toBe("BAA");
  });
});
