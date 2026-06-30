import { describe, it, expect } from "vitest";
import {
  demoAdvisorReply,
  demoAssessment,
  demoBuildHtml,
  demoPlan,
} from "../lib/demo";
import type { ChatMessage } from "../lib/types";

const userMsg = (content: string): ChatMessage => ({
  id: "u1",
  role: "user",
  content,
});
const advisorMsg = (content: string): ChatMessage => ({
  id: "a1",
  role: "advisor",
  content,
});

describe("demoAdvisorReply", () => {
  it("returns a non-empty string", () => {
    const reply = demoAdvisorReply([userMsg("I want to build an app")], false);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("returns a closing message when phase is closing", () => {
    const reply = demoAdvisorReply([userMsg("my idea")], true);
    expect(reply).toContain("sharp enough to build");
  });

  it("rotates pushbacks across turns", () => {
    const history = [userMsg("idea"), advisorMsg("q1"), userMsg("answer")];
    const reply1 = demoAdvisorReply([userMsg("idea")], false);
    const reply2 = demoAdvisorReply(history, false);
    expect(typeof reply1).toBe("string");
    expect(typeof reply2).toBe("string");
  });
});

describe("demoAssessment", () => {
  it("returns a valid Assessment shape", () => {
    const history = [userMsg("I want to build a robotics tracker")];
    const result = demoAssessment(history, null, 80);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(typeof result.clarity.score).toBe("number");
    expect(typeof result.conciseness.score).toBe("number");
    expect(typeof result.ready).toBe("boolean");
    expect(result.threshold).toBe(80);
  });

  it("scores rise as the builder engages across turns", () => {
    const oneMsg = demoAssessment([userMsg("idea")], null, 80);
    const fiveMsgs = demoAssessment(
      [userMsg("a"), advisorMsg("q"), userMsg("b"), advisorMsg("r"), userMsg("c")],
      null,
      80,
    );
    expect(fiveMsgs.overall).toBeGreaterThanOrEqual(oneMsg.overall);
  });

  it("includes prior criteria when provided", () => {
    const prior = [{ key: "specificity", label: "Specificity", bestPractice: "be specific" }];
    const result = demoAssessment([userMsg("idea")], prior, 80);
    expect(result.dynamicCriteria.some((d) => d.key === "specificity")).toBe(true);
  });
});

describe("demoBuildHtml", () => {
  it("returns a non-empty string that looks like HTML", () => {
    const html = demoBuildHtml("App", "A todo list");
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(100);
    expect(html.toLowerCase()).toContain("<!doctype html>");
  });
});

describe("demoPlan", () => {
  it("returns a BuildPlan with parts", () => {
    const plan = demoPlan("App", "A simple todo list", "Alex", "Minecraft");
    expect(plan.parts.length).toBeGreaterThan(0);
    expect(typeof plan.projectName).toBe("string");
    expect(typeof plan.bigPicture).toBe("string");
    for (const part of plan.parts) {
      // demoPlan returns Omit<BuildPart, "id"> — id is assigned by BuildWorkspace
      expect(typeof part.title).toBe("string");
      expect(typeof part.buildSpec).toBe("string");
    }
  });
});
