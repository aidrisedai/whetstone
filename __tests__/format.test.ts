import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

// ── uid ──────────────────────────────────────────────────────────────────────

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(typeof uid()).toBe("string");
    expect(uid().length).toBeGreaterThan(0);
  });

  it("uses the provided prefix", () => {
    expect(uid("msg").startsWith("msg_")).toBe(true);
  });

  it("generates unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => uid("t")));
    expect(ids.size).toBe(20);
  });
});

// ── assembleBeats ─────────────────────────────────────────────────────────────

const htmlBeats: CodeBeat[] = [
  { label: "Head", lang: "html", code: "<!DOCTYPE html><html><body>", say: "", isNew: true },
  { label: "Body", lang: "html", code: "<h1>Hi</h1>", say: "", isNew: true },
  { label: "Close", lang: "html", code: "</body></html>", say: "", isNew: false },
];

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats(htmlBeats)).toBe(
      "<!DOCTYPE html><html><body><h1>Hi</h1></body></html>"
    );
  });

  it("returns an empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the given index", () => {
    expect(assembleBeatsUpTo(htmlBeats, 1)).toBe(
      "<!DOCTYPE html><html><body><h1>Hi</h1>"
    );
  });

  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo(htmlBeats, 0)).toBe("<!DOCTYPE html><html><body>");
  });

  it("returns the full document at the last index", () => {
    expect(assembleBeatsUpTo(htmlBeats, 2)).toBe(assembleBeats(htmlBeats));
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validBeats: CodeBeat[] = [
    {
      label: "Full",
      lang: "html",
      code: "<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>",
      say: "",
      isNew: true,
    },
  ];

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false for beats with no DOCTYPE", () => {
    const beats: CodeBeat[] = [
      { label: "x", lang: "html", code: "<html><body></body></html>", say: "", isNew: true },
    ];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false for beats missing the closing </html>", () => {
    const beats: CodeBeat[] = [
      { label: "x", lang: "html", code: "<!DOCTYPE html><html><body>", say: "", isNew: true },
    ];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const code = `function hello() {\n  return "world";\n}`;

  it("applies a single find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: '"world"', replace: '"earth"' },
    ]);
    expect(out).toContain('"earth"');
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "hello", replace: "greet" },
      { find: '"world"', replace: '"universe"' },
    ]);
    expect(out).toContain("greet");
    expect(out).toContain('"universe"');
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not present", () => {
    const { applied } = applyEdits(code, [{ find: "notfound", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("reports only the count of applied edits", () => {
    const { applied } = applyEdits(code, [
      { find: "hello", replace: "hi" },
      { find: "NOPE", replace: "x" },
    ]);
    expect(applied).toBe(1);
  });

  it("skips edits with an empty find string", () => {
    const { applied } = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("returns the original code when no edits apply", () => {
    const { code: out } = applyEdits(code, []);
    expect(out).toBe(code);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips triple-backtick fences", () => {
    const fenced = "```html\n<h1>hi</h1>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<h1>hi</h1>");
  });

  it("strips plain triple-backtick fences", () => {
    const fenced = "```\n<h1>hi</h1>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<h1>hi</h1>");
  });

  it("passes through clean HTML unchanged", () => {
    const html = "<h1>hello</h1>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/empty gracefully", () => {
    // @ts-expect-error intentional bad input
    expect(cleanGeneratedHtml(null)).toBe("");
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
