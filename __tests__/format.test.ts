import { describe, it, expect } from "vitest";
import {
  applyEdits,
  cleanGeneratedHtml,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  uid,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

// ── uid ───────────────────────────────────────────────────────────────────────

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(uid()).toBeTruthy();
  });

  it("returns unique ids on successive calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => uid()));
    expect(ids.size).toBe(20);
  });

  it("uses the supplied prefix", () => {
    expect(uid("part").startsWith("part_")).toBe(true);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips a ```html fence", () => {
    const input = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("strips a plain ``` fence", () => {
    const input = "```\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("returns plain HTML unchanged (trimmed)", () => {
    const input = "  <html></html>  ";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("handles null-ish input gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const base = "<html><body><h1>Hello</h1></body></html>";

  it("applies a single edit", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "World" }]);
    expect(applied).toBe(1);
    expect(code).toBe("<html><body><h1>World</h1></body></html>");
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "<h1>", replace: "<h2>" },
      { find: "</h1>", replace: "</h2>" },
    ]);
    expect(applied).toBe(2);
    expect(code).toContain("<h2>Hello</h2>");
  });

  it("reports 0 applied when find string is absent", () => {
    const { code, applied } = applyEdits(base, [{ find: "NOTFOUND", replace: "X" }]);
    expect(applied).toBe(0);
    expect(code).toBe(base);
  });

  it("only replaces the first occurrence", () => {
    const src = "aaa";
    const { code, applied } = applyEdits(src, [{ find: "a", replace: "b" }]);
    expect(applied).toBe(1);
    expect(code).toBe("baa"); // only first 'a' replaced
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "X" }]);
    expect(applied).toBe(0);
    expect(code).toBe(base);
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(applied).toBe(0);
    expect(code).toBe(base);
  });

  it("skips malformed edit objects", () => {
    const malformed = [null, undefined, { find: 123, replace: "x" }] as unknown as Parameters<
      typeof applyEdits
    >[1];
    const { code, applied } = applyEdits(base, malformed);
    expect(applied).toBe(0);
    expect(code).toBe(base);
  });
});

// ── assembleBeats ──────────────────────────────────────────────────────────────

function beat(code: string): CodeBeat {
  return { label: "step", lang: "html", code, say: "", isNew: false };
}

describe("assembleBeats", () => {
  it("concatenates all beats in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<html>"), beat("</html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><html></html>");
  });

  it("returns empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ─────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("returns only up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const VALID_DOC = `<!DOCTYPE html>
<html>
<head><title>App</title></head>
<body><p>Hi</p></body>
</html>`;

  it("accepts a well-formed HTML document", () => {
    expect(beatsFormValidDoc([beat(VALID_DOC)])).toBe(true);
  });

  it("rejects an empty array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("rejects a document missing the DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("rejects a document missing closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("rejects a document missing <body>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("accepts a document assembled from multiple beats", () => {
    const beats = [
      beat("<!DOCTYPE html>\n<html>\n<head></head>\n"),
      beat("<body><p>Hello</p></body>\n"),
      beat("</html>"),
    ];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });
});
