import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

function beat(code: string, isNew = true): CodeBeat {
  return { label: "L", lang: "html", code, say: "s", isNew };
}

describe("uid", () => {
  it("generates unique ids each call", () => {
    const ids = Array.from({ length: 50 }, () => uid());
    expect(new Set(ids).size).toBe(50);
  });
  it("uses the supplied prefix", () => {
    expect(uid("x")).toMatch(/^x_/);
  });
  it("defaults to 'm' prefix", () => {
    expect(uid()).toMatch(/^m_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("includes only beats 0..index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
  it("includes all beats at last index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
  it("returns just first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat('<!DOCTYPE html><html lang="en"><head></head>'),
    beat("<body>content</body>"),
    beat("</html>"),
  ];

  it("returns true for a valid reassembled HTML doc", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false when no DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when no closing </html>", () => {
    expect(beatsFormValidDoc([beat('<!DOCTYPE html><html><body>')])).toBe(false);
  });

  it("returns false when no <body", () => {
    expect(beatsFormValidDoc([beat('<!DOCTYPE html><html></html>')])).toBe(false);
  });

  it("returns false for empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips backtick fences with html lang tag", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("strips bare backtick fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("leaves already-clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });
  it("handles null-ish input gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const code = "<body><p>Hello</p><p>World</p></body>";

  it("applies a single find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "Hello", replace: "Hi" }]);
    expect(out).toContain("Hi");
    expect(out).not.toContain("Hello");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(out).toContain("Hi");
    expect(out).toContain("Earth");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const { code: out } = applyEdits("<p>A</p><p>A</p>", [{ find: "<p>A</p>", replace: "<p>B</p>" }]);
    expect(out).toBe("<p>B</p><p>A</p>");
  });

  it("skips edits where find is not found and reports count", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "NOPE", replace: "X" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("skips malformed edits (empty find string)", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "", replace: "X" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("returns original code and 0 for empty edits array", () => {
    const { code: out, applied } = applyEdits(code, []);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });
});
