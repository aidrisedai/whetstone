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

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew: true,
});

describe("uid", () => {
  it("returns a string", () => expect(typeof uid()).toBe("string"));
  it("uses the given prefix", () => expect(uid("msg").startsWith("msg_")).toBe(true));
  it("produces unique values across calls", () => {
    const a = uid("x");
    const b = uid("x");
    expect(a).not.toBe(b);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
  it("includes all beats when index is last", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("XY");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc =
    '<!DOCTYPE html><html><head></head><body><p>Hi</p></body></html>';

  it("returns true for a valid HTML doc", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false if missing <!DOCTYPE html>", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false if missing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false if missing <body", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    const result = cleanGeneratedHtml("```html\n<!DOCTYPE html>\n```");
    expect(result).toBe("<!DOCTYPE html>");
  });

  it("strips bare ``` fences", () => {
    const result = cleanGeneratedHtml("```\n<!DOCTYPE html>\n```");
    expect(result).toBe("<!DOCTYPE html>");
  });

  it("leaves unfenced HTML unchanged", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <!DOCTYPE html>  ")).toBe("<!DOCTYPE html>");
  });

  it("handles empty/null-ish input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const base = '<html><body><p id="msg">Hello</p></body></html>';

  it("applies a single edit on exact match", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "World" }]);
    expect(code).toBe('<html><body><p id="msg">World</p></body></html>');
    expect(applied).toBe(1);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "Goodbye", replace: "World" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "</body>", replace: "<footer/></body>" },
    ]);
    expect(code).toContain("Hi");
    expect(code).toContain("<footer/>");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const src = "aaa";
    const { code } = applyEdits(src, [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("skips edits with empty find", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("returns original code unchanged for empty edits list", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
