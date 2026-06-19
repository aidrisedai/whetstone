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

const beat = (code: string, label = "chunk"): CodeBeat => ({
  label,
  lang: "html",
  code,
  say: "narration",
  isNew: true,
});

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(uid()).toBeTruthy();
  });
  it("returns unique values on each call", () => {
    const ids = new Set(Array.from({ length: 50 }, () => uid()));
    expect(ids.size).toBe(50);
  });
  it("uses the provided prefix", () => {
    expect(uid("beat").startsWith("beat_")).toBe(true);
  });
  it("defaults to the 'm' prefix", () => {
    expect(uid().startsWith("m_")).toBe(true);
  });
});

describe("assembleBeats", () => {
  it("concatenates code from all beats in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><body></body></html>");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
  it("returns single beat's code unchanged", () => {
    expect(assembleBeats([beat("hello")])).toBe("hello");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C"), beat("D")];

  it("includes only beats 0 through index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
  it("includes all beats at the last index", () => {
    expect(assembleBeatsUpTo(beats, 3)).toBe("ABCD");
  });
  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat("<!DOCTYPE html><html><head></head>"),
    beat("<body>content</body></html>"),
  ];

  it("returns true for a valid HTML document assembled from beats", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });
  it("returns false when DOCTYPE is missing", () => {
    const beats = [beat("<html><body>hi</body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
  it("returns false when closing </html> is missing", () => {
    const beats = [beat("<!DOCTYPE html><html><body>hi</body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
  it("returns false when <body is missing", () => {
    const beats = [beat("<!DOCTYPE html><html></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
  it("returns false for empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips a ```html ... ``` fence", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("strips a plain ``` ... ``` fence", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("leaves unfenced content unchanged", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });
  it("handles null-ish input gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "<div>hello world</div>";

  it("applies a single find-and-replace edit", () => {
    const { code, applied } = applyEdits(base, [{ find: "hello", replace: "goodbye" }]);
    expect(code).toBe("<div>goodbye world</div>");
    expect(applied).toBe(1);
  });

  it("returns 0 applied when find string is not found", () => {
    const { applied } = applyEdits(base, [{ find: "missing", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "hello", replace: "goodbye" },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("<div>goodbye earth</div>");
    expect(applied).toBe(2);
  });

  it("skips edits with an empty find string", () => {
    const { applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence of find", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("returns original code with 0 applied for empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
