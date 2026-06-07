import { describe, it, expect } from "vitest";
import { uid } from "@/lib/format";

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(uid().length).toBeGreaterThan(0);
  });

  it("generates unique values on each call", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});
