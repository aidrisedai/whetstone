import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeats(beats)).toBe("abc");
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the given index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });
  it("handles index 0", () => {
    expect(assembleBeatsUpTo([beat("x"), beat("y")], 0)).toBe("x");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html><html><head></head><body></body></html>`;
  const validBeats = [beat(validHtml)];

  it("returns true for a valid HTML document across beats", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false when beats are empty", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false for a fragment without <!DOCTYPE html>", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false for unclosed html tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("splits across beats correctly — reassembled form is checked", () => {
    const beats = [beat("<!DOCTYPE html><html><body>"), beat("</body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });
});

describe("applyEdits", () => {
  const code = "<html><head></head><body>Hello world</body></html>";

  it("applies a single edit", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello world", replace: "Goodbye world" },
    ]);
    expect(out).toContain("Goodbye world");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "<head></head>", replace: "<head><title>T</title></head>" },
      { find: "Hello world", replace: "Hi!" },
    ]);
    expect(out).toContain("<title>T</title>");
    expect(out).toContain("Hi!");
    expect(applied).toBe(2);
  });

  it("returns 0 applied if find string not found", () => {
    const { applied } = applyEdits(code, [{ find: "NOTFOUND", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("returns original code unmodified if no edits", () => {
    const { code: out, applied } = applyEdits(code, []);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const base = "aaa";
    const { code: out } = applyEdits(base, [{ find: "a", replace: "b" }]);
    expect(out).toBe("baa");
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips a ```html code fence", () => {
    const raw = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<!DOCTYPE html>\n<html></html>");
  });

  it("strips a ``` (no lang) code fence", () => {
    const raw = "```\n<!DOCTYPE html>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<!DOCTYPE html>");
  });

  it("passes through plain HTML unchanged", () => {
    const raw = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(raw)).toBe(raw);
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  hello  ")).toBe("hello");
  });
});
