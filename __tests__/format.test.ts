import { describe, it, expect } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

function beat(code: string, isNew = true): CodeBeat {
  return { label: "L", lang: "html", code, say: "s", isNew };
}

describe("applyEdits", () => {
  it("applies a single exact replacement", () => {
    const { code, applied } = applyEdits("<h1>Hello</h1>", [
      { find: "Hello", replace: "World" },
    ]);
    expect(code).toBe("<h1>World</h1>");
    expect(applied).toBe(1);
  });

  it("applies only the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits whose find string is not present", () => {
    const { code, applied } = applyEdits("<p>text</p>", [
      { find: "missing", replace: "nope" },
    ]);
    expect(code).toBe("<p>text</p>");
    expect(applied).toBe(0);
  });

  it("skips empty find strings", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("<a> <b>", [
      { find: "<a>", replace: "[A]" },
      { find: "<b>", replace: "[B]" },
    ]);
    expect(code).toBe("[A] [B]");
    expect(applied).toBe(2);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><body></body></html>");
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
  const validDoc =
    '<!DOCTYPE html><html lang="en"><head></head><body><p>hi</p></body></html>';

  it("returns true for a valid HTML document from beats", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing code fences", () => {
    const input = "```html\n<!DOCTYPE html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html>");
  });

  it("strips plain code fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves clean HTML untouched", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null-ish input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
