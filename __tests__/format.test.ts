import { describe, it, expect } from "vitest";
import { applyEdits, beatsFormValidDoc, assembleBeats, cleanGeneratedHtml } from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string): CodeBeat => ({ label: "l", lang: "html", code, say: "s", isNew: true });

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("<h1>Hello</h1>", [
      { find: "Hello", replace: "World" },
    ]);
    expect(code).toBe("<h1>World</h1>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("<h1>A</h1><p>B</p>", [
      { find: "A", replace: "X" },
      { find: "B", replace: "Y" },
    ]);
    expect(code).toBe("<h1>X</h1><p>Y</p>");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is absent", () => {
    const { code, applied } = applyEdits("<h1>Hello</h1>", [
      { find: "Goodbye", replace: "World" },
    ]);
    expect(code).toBe("<h1>Hello</h1>");
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("skips edits with empty find string", () => {
    const { applied } = applyEdits("<p>hi</p>", [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("returns applied=0 for an empty edits list", () => {
    const { code, applied } = applyEdits("<p>hi</p>", []);
    expect(code).toBe("<p>hi</p>");
    expect(applied).toBe(0);
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html>\n<html lang="en">\n<head></head>\n<body>\n<p>hi</p>\n</body>\n</html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html>\n<html><body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("concatenates beats before checking", () => {
    const half1 = beat("<!DOCTYPE html>\n<html><body>");
    const half2 = beat("</body></html>");
    expect(beatsFormValidDoc([half1, half2])).toBe(true);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("ab"), beat("cd"), beat("ef")])).toBe("abcdef");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing code fences", () => {
    const raw = "```html\n<!DOCTYPE html>\n</html>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<!DOCTYPE html>\n</html>");
  });
  it("passes clean HTML through unchanged", () => {
    const html = "<!DOCTYPE html>\n<html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as never)).toBe("");
  });
});
