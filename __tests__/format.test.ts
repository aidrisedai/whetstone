import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  applyEdits,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  uid,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "say",
  isNew: true,
});

describe("uid", () => {
  it("returns a non-empty string", () => expect(uid()).toBeTruthy());
  it("uses supplied prefix", () => expect(uid("u").startsWith("u_")).toBe(true));
  it("returns unique values", () => expect(uid()).not.toBe(uid()));
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
  it("includes only beats up to and including index", () => {
    const beats = [beat("A"), beat("B"), beat("C"), beat("D")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("includes everything at last index", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("XY");
  });

  it("returns just the first beat at index 0", () => {
    const beats = [beat("first"), beat("second")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("first");
  });
});

const validDoc = `<!DOCTYPE html>
<html lang="en">
<head><title>T</title></head>
<body><p>Hi</p></body>
</html>`;

describe("beatsFormValidDoc", () => {
  it("returns true for a valid document assembled from beats", () => {
    const parts = [validDoc.slice(0, 50), validDoc.slice(50)];
    expect(beatsFormValidDoc(parts.map(beat))).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    const fenced = "```html\n<h1>hi</h1>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<h1>hi</h1>");
  });

  it("strips plain code fences without language", () => {
    expect(cleanGeneratedHtml("```\nfoo\n```")).toBe("foo");
  });

  it("passes through plain HTML untouched", () => {
    expect(cleanGeneratedHtml("<!DOCTYPE html>")).toBe("<!DOCTYPE html>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("   <p>hi</p>   ")).toBe("<p>hi</p>");
  });

  it("handles null-ish input gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "Hello world, goodbye world";

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toBe("Hi world, goodbye world");
    expect(applied).toBe(1);
  });

  it("applies only the first occurrence", () => {
    const { code, applied } = applyEdits(base, [{ find: "world", replace: "earth" }]);
    expect(code).toBe("Hello earth, goodbye world");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "goodbye", replace: "farewell" },
    ]);
    expect(code).toBe("Hi world, farewell world");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is absent", () => {
    const { code, applied } = applyEdits(base, [{ find: "notfound", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("returns original code unchanged if no edits", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
