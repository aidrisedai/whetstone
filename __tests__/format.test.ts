import { describe, expect, it } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  uid,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "",
  isNew: true,
});

describe("uid", () => {
  it("generates unique ids", () => {
    const a = uid("x");
    const b = uid("x");
    expect(a).not.toBe(b);
  });

  it("uses the given prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates all beat codes", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns all beats when index equals length - 1", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body>Hello</body></html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
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

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown html code fences", () => {
    const fenced = "```html\n<h1>Hello</h1>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<h1>Hello</h1>");
  });

  it("passes through clean HTML unchanged", () => {
    expect(cleanGeneratedHtml("<p>Hi</p>")).toBe("<p>Hi</p>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const code = '<p id="title">Hello World</p>';

  it("applies a single find-and-replace", () => {
    const result = applyEdits(code, [{ find: "Hello World", replace: "Goodbye World" }]);
    expect(result.code).toBe('<p id="title">Goodbye World</p>');
    expect(result.applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const result = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(result.code).toBe('<p id="title">Hi Earth</p>');
    expect(result.applied).toBe(2);
  });

  it("reports 0 applied when nothing matches", () => {
    const result = applyEdits(code, [{ find: "NOTFOUND", replace: "X" }]);
    expect(result.applied).toBe(0);
    expect(result.code).toBe(code);
  });

  it("skips edits with empty find string", () => {
    const result = applyEdits(code, [{ find: "", replace: "X" }]);
    expect(result.applied).toBe(0);
    expect(result.code).toBe(code);
  });

  it("applies only first occurrence", () => {
    const repeating = "AAA";
    const result = applyEdits(repeating, [{ find: "A", replace: "B" }]);
    expect(result.code).toBe("BAA");
    expect(result.applied).toBe(1);
  });
});
