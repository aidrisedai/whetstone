import { describe, expect, it } from "vitest";
import {
  asChatHistory,
  asCriteria,
  asNumber,
  asPart,
  asStringArray,
  asText,
  asTrimmed,
  readJsonBody,
  safeParseJson,
} from "./serverUtils";

/** Build a Request the way a route receives one. */
function post(body: string): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("readJsonBody", () => {
  it("returns the parsed object for a JSON object body", async () => {
    expect(await readJsonBody(post('{"a":1}'))).toEqual({ a: 1 });
  });

  it("returns null for malformed JSON", async () => {
    expect(await readJsonBody(post("{not json"))).toBeNull();
  });

  it("returns null for JSON that isn't an object", async () => {
    expect(await readJsonBody(post("null"))).toBeNull();
    expect(await readJsonBody(post("42"))).toBeNull();
    expect(await readJsonBody(post('"hi"'))).toBeNull();
    expect(await readJsonBody(post("[1,2]"))).toBeNull();
  });
});

describe("asText / asTrimmed", () => {
  it("passes strings through, preserving whitespace only in asText", () => {
    expect(asText("  hi  ")).toBe("  hi  ");
    expect(asTrimmed("  hi  ")).toBe("hi");
  });

  it("falls back for every non-string value", () => {
    for (const bad of [42, true, null, undefined, [], {}, ["x"]]) {
      expect(asText(bad, "fb")).toBe("fb");
      expect(asTrimmed(bad, "fb")).toBe("fb");
    }
  });

  it("defaults the fallback to an empty string", () => {
    expect(asText(42)).toBe("");
    expect(asTrimmed(null)).toBe("");
  });
});

describe("asNumber", () => {
  it("accepts finite numbers, including zero and negatives", () => {
    expect(asNumber(0, 1)).toBe(0);
    expect(asNumber(-3, 1)).toBe(-3);
    expect(asNumber(2.5, 1)).toBe(2.5);
  });

  it("falls back for non-finite and non-number values", () => {
    for (const bad of [NaN, Infinity, -Infinity, "2", true, null, undefined, {}, []]) {
      expect(asNumber(bad, 7)).toBe(7);
    }
  });
});

describe("asStringArray", () => {
  it("keeps only the string entries", () => {
    expect(asStringArray(["a", 1, null, "b", {}])).toEqual(["a", "b"]);
  });

  it("returns an empty array for non-arrays", () => {
    for (const bad of [null, undefined, "a", 42, {}]) {
      expect(asStringArray(bad)).toEqual([]);
    }
  });
});

describe("asChatHistory", () => {
  it("keeps well-formed messages and normalizes the role", () => {
    const history = asChatHistory([
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "advisor", content: "hello" },
      { id: "3", role: "wat", content: "odd role" },
    ]);
    expect(history).toEqual([
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "advisor", content: "hello" },
      { id: "3", role: "user", content: "odd role" },
    ]);
  });

  it("drops entries that aren't usable messages", () => {
    expect(asChatHistory([null, 42, {}, { role: "user" }, { id: "1", role: "user", content: "ok" }])).toEqual([
      { id: "1", role: "user", content: "ok" },
    ]);
  });

  it("substitutes an empty id when it's missing or the wrong type", () => {
    expect(asChatHistory([{ role: "user", content: "hi" }])).toEqual([{ id: "", role: "user", content: "hi" }]);
  });

  it("returns null when nothing usable is left", () => {
    expect(asChatHistory([])).toBeNull();
    expect(asChatHistory([null, 42, {}])).toBeNull();
    expect(asChatHistory("history")).toBeNull();
    expect(asChatHistory(undefined)).toBeNull();
  });

  it("keeps only well-formed image attachments", () => {
    const history = asChatHistory([
      {
        id: "1",
        role: "user",
        content: "look",
        images: [
          { mediaType: "image/png", data: "abc", name: "shot.png" },
          { mediaType: "image/png" },
          "nope",
          { mediaType: 5, data: "abc" },
        ],
      },
    ]);
    expect(history?.[0].images).toEqual([{ mediaType: "image/png", data: "abc", name: "shot.png" }]);
  });

  it("omits images entirely when none survive", () => {
    const history = asChatHistory([{ id: "1", role: "user", content: "hi", images: ["nope"] }]);
    expect(history?.[0]).not.toHaveProperty("images");
  });
});

describe("asCriteria", () => {
  it("keeps specs that carry a key and a label", () => {
    expect(asCriteria([{ key: "k", label: "L", bestPractice: "bp" }, { key: "x" }, null])).toEqual([
      { key: "k", label: "L", bestPractice: "bp" },
    ]);
  });

  it("defaults a missing bestPractice to an empty string", () => {
    expect(asCriteria([{ key: "k", label: "L" }])).toEqual([{ key: "k", label: "L", bestPractice: "" }]);
  });

  it("returns null when absent or unusable", () => {
    expect(asCriteria(null)).toBeNull();
    expect(asCriteria([])).toBeNull();
    expect(asCriteria([{ nope: true }])).toBeNull();
  });
});

describe("asPart", () => {
  it("coerces every field to a string", () => {
    expect(asPart({ title: "  T  ", whatItIs: 5, concept: null, buildSpec: "spec" })).toEqual({
      title: "T",
      whatItIs: "",
      concept: "",
      buildSpec: "spec",
    });
  });

  it("returns null when the part isn't an object", () => {
    for (const bad of [null, undefined, "part", 42, []]) {
      expect(asPart(bad)).toBeNull();
    }
  });
});

describe("safeParseJson", () => {
  it("parses plain and fenced JSON", () => {
    expect(safeParseJson('{"a":1}')).toEqual({ a: 1 });
    expect(safeParseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(safeParseJson('here you go: {"a":1} — done')).toEqual({ a: 1 });
  });
});
