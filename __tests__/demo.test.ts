import { describe, it, expect } from "vitest";
import { demoAdvisorReply } from "@/lib/demo";
import type { ChatMessage } from "@/lib/types";

const userMsg = (content: string): ChatMessage => ({
  id: "1",
  role: "user",
  content,
});

describe("demoAdvisorReply", () => {
  it("returns a closing message when closing=true", () => {
    const reply = demoAdvisorReply([userMsg("an idea")], true);
    expect(reply).toBeTruthy();
    expect(reply.length).toBeGreaterThan(10);
  });

  it("returns a non-empty pushback for a single user turn", () => {
    const history: ChatMessage[] = [userMsg("I want to build a game tracker")];
    const reply = demoAdvisorReply(history, false);
    expect(reply).toBeTruthy();
    expect(reply.length).toBeGreaterThan(10);
  });

  it("progresses through pushbacks on subsequent turns", () => {
    const history: ChatMessage[] = [
      userMsg("I want to build a game"),
      { id: "2", role: "advisor", content: "pushback 1" },
      userMsg("a platformer with coins"),
      { id: "3", role: "advisor", content: "pushback 2" },
      userMsg("it tracks your best scores"),
    ];
    const reply1 = demoAdvisorReply(history.slice(0, 1), false);
    const reply2 = demoAdvisorReply(history.slice(0, 5), false);
    // Different turns should produce different responses
    expect(reply1).not.toBe(reply2);
  });

  it("returns a different response for image-containing history", () => {
    const withImage: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "here is my sketch",
        images: [{ mediaType: "image/png", data: "abc", name: "sketch.png" }],
      },
    ];
    const reply = demoAdvisorReply(withImage, false);
    expect(reply).toBeTruthy();
    // Image path gives a specific "I can see the sketch" response
    expect(reply).toMatch(/sketch|screen|layout|feed/i);
  });
});
