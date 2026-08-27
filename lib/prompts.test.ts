import { describe, expect, it } from "vitest";
import { BOARD_SCHEMA } from "./prompts";

describe("BOARD_SCHEMA", () => {
  it("does not require 'ask' on a board step", () => {
    // `ask` is optional on BoardStep (lib/types.ts) and the prompt tells the
    // model to use it on "~half the steps" — if the JSON schema requires it,
    // the model is forced to invent a check-in question on every step.
    const stepSchema = BOARD_SCHEMA.properties.steps.items;
    expect(stepSchema.required).toEqual(["say", "items"]);
    expect(stepSchema.properties).toHaveProperty("ask");
  });
});
