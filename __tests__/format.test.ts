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
  return { label: "test", lang: "html", code, say: "", isNew };
}

// ── uid ──────────────────────────────────────────────────────────────────────

describe("uid", () => {
  it("returns a string with the given prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
  });

  it("generates unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });

  it("defaults to 'm' prefix", () => {
    expect(uid()).toMatch(/^m_/);
  });
});

// ── assembleBeats ────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const result = assembleBeats([beat("<!DOCTYPE html>"), beat("<body>"), beat("</body></html>")]);
    expect(result).toBe("<!DOCTYPE html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c")];

  it("includes beats up to and including index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });

  it("returns all beats at the last index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

// ── beatsFormValidDoc ────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat('<!DOCTYPE html><html><head></head>'),
    beat('<body>content</body>'),
    beat('</html>'),
  ];

  it("returns true for beats that form a valid HTML doc", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> closing tag is missing", () => {
    expect(beatsFormValidDoc([beat('<!DOCTYPE html><html><body>content</body>')])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    expect(beatsFormValidDoc([beat('<!DOCTYPE html><html></html>')])).toBe(false);
  });

  it("returns false for empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

// ── cleanGeneratedHtml ───────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips html code fences", () => {
    const input = "```html\n<!DOCTYPE html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html>");
  });

  it("strips bare code fences", () => {
    const input = "```\n<div>test</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>test</div>");
  });

  it("leaves clean HTML unchanged", () => {
    const input = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html><html></html>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

// ── applyEdits ───────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single find-and-replace edit", () => {
    const { code, applied } = applyEdits("<div>hello</div>", [
      { find: "hello", replace: "world" },
    ]);
    expect(code).toBe("<div>world</div>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("<a><b><c>", [
      { find: "<a>", replace: "[a]" },
      { find: "<c>", replace: "[c]" },
    ]);
    expect(code).toBe("[a]<b>[c]");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not found", () => {
    const original = "<div>content</div>";
    const { code, applied } = applyEdits(original, [
      { find: "notfound", replace: "x" },
    ]);
    expect(code).toBe(original);
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("skips edits with empty find string", () => {
    const original = "content";
    const { code, applied } = applyEdits(original, [{ find: "", replace: "x" }]);
    expect(code).toBe(original);
    expect(applied).toBe(0);
  });

  it("returns 0 applied for an empty edits array", () => {
    const { applied } = applyEdits("content", []);
    expect(applied).toBe(0);
  });
});
