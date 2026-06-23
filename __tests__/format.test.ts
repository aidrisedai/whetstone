import { describe, it, expect } from "vitest";
import { uid, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml, applyEdits } from "../lib/format";
import type { CodeBeat } from "../lib/types";

function beat(code: string): CodeBeat {
  return { label: "l", lang: "html", code, say: "s", isNew: false };
}

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(uid()).toBeTruthy();
    expect(typeof uid()).toBe("string");
  });

  it("uses the given prefix", () => {
    expect(uid("x").startsWith("x_")).toBe(true);
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => uid()));
    expect(ids.size).toBe(50);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats up to and including index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("includes all beats when index = last", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("XY");
  });

  it("returns just first beat at index 0", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when missing <!DOCTYPE html>", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when missing </html> closing tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when missing <body> tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const fenced = "```html\n<h1>Hello</h1>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<h1>Hello</h1>");
  });

  it("strips generic code fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves plain HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>hello</p>")).toBe("<p>hello</p>");
  });

  it("handles null-ish input gracefully", () => {
    expect(() => cleanGeneratedHtml(null as unknown as string)).not.toThrow();
  });
});

describe("applyEdits", () => {
  const code = `<div class="box">hello world</div>`;

  it("applies a single find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "hello", replace: "goodbye" }]);
    expect(out).toContain("goodbye");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "hello", replace: "hi" },
      { find: "world", replace: "earth" },
    ]);
    expect(out).toContain("hi earth");
    expect(applied).toBe(2);
  });

  it("returns applied=0 when nothing matches", () => {
    const { applied } = applyEdits(code, [{ find: "NOTFOUND", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "", replace: "oops" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code: out } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(out).toBe("baa");
  });

  it("skips null/invalid entries gracefully", () => {
    const { code: out, applied } = applyEdits(code, [null as unknown as { find: string; replace: string }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });
});
