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

function beat(code: string, isNew = true): CodeBeat {
  return { label: "l", lang: "html", code, say: "s", isNew };
}

describe("uid", () => {
  it("returns a non-empty string", () => expect(uid()).toBeTruthy());
  it("accepts a custom prefix", () => expect(uid("msg").startsWith("msg_")).toBe(true));
  it("generates unique ids across calls", () => expect(uid()).not.toBe(uid()));
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const result = assembleBeats([beat("a"), beat("b"), beat("c")]);
    expect(result).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c")];

  it("includes only beats up to and including the index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("returns single beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });

  it("returns all beats when index equals last", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat('<!DOCTYPE html><html lang="en"><head></head>'),
    beat("<body>hello</body>"),
    beat("</html>"),
  ];

  it("returns true for a complete, valid HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body>x</body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat('<!DOCTYPE html><html><body>x</body>')])).toBe(false);
  });

  it("returns false for empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when <body is absent", () => {
    expect(beatsFormValidDoc([beat('<!DOCTYPE html><html></html>')])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ```", () => {
    const html = cleanGeneratedHtml("```html\n<div>hello</div>\n```");
    expect(html).toBe("<div>hello</div>");
  });

  it("strips bare ``` fences", () => {
    const html = cleanGeneratedHtml("```\n<p>hi</p>\n```");
    expect(html).toBe("<p>hi</p>");
  });

  it("leaves clean HTML untouched", () => {
    const raw = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(raw)).toBe(raw);
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("handles undefined-like input gracefully", () => {
    expect(cleanGeneratedHtml("" as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "Hello, world! Goodbye, world!";

  it("applies a single edit", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toBe("Hi, world! Goodbye, world!");
    expect(applied).toBe(1);
  });

  it("applies edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "Goodbye", replace: "Farewell" },
    ]);
    expect(code).toBe("Hi, world! Farewell, world!");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "Nonexistent", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence of each find string", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("returns the original code when edits array is empty", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
