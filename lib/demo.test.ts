/**
 * lib/demo.ts had no tests, which is how a scoreboard bug survived: every
 * dynamic dimension reported "Still thin on <label>" no matter how high it
 * scored, so a sharpened idea sitting at 98 was still told it was thin.
 *
 * Demo mode is the default with no ANTHROPIC_API_KEY set — the README promises
 * the full experience works either way — so this feedback text is the entire
 * loop for a first-time user, and it has to track the number above it.
 */

import { describe, expect, it } from "vitest";
import { demoAssessment, demoLesson } from "./demo";
import type { ChatMessage } from "./types";

const say = (content: string, i: number): ChatMessage => ({ id: `m${i}`, role: "user", content });

/** A thin pitch: one short turn, so every dimension scores low. */
const THIN: ChatMessage[] = [say("an app for my team", 0)];

/** A sharpened pitch: many long, specific turns, so the scores climb. */
const SHARP: ChatMessage[] = [
  "I want to build a parts tracker for my FRC robotics team.",
  "It is for the 25 students on our team who lose track of which parts were ordered and which arrived.",
  "Today we use a messy shared spreadsheet; parts get double-ordered and we waste about $400 a season.",
  "Success is zero double-orders in a season and any member seeing part status in under 10 seconds.",
  "v1 is a web app: add a part, mark it ordered or arrived, filter the list. No accounts, one shared board.",
  "I will test it with my own team over the six-week build season and count double-orders before and after.",
].map(say);

describe("demoAssessment", () => {
  it("scores a thin pitch low and a sharpened one high", () => {
    expect(demoAssessment(THIN, null, 80).overall).toBeLessThan(
      demoAssessment(SHARP, null, 80).overall,
    );
  });

  it("keeps every score inside 0–100", () => {
    for (const history of [THIN, SHARP]) {
      const a = demoAssessment(history, null, 80);
      for (const { score } of [a.clarity, a.conciseness, ...a.dynamicCriteria]) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("calls a thin dimension thin", () => {
    for (const d of demoAssessment(THIN, null, 80).dynamicCriteria) {
      expect(d.score).toBeLessThan(60);
      expect(d.rationale).toMatch(/still thin/i);
    }
  });

  it("stops calling a dimension thin once it scores well", () => {
    const { dynamicCriteria } = demoAssessment(SHARP, null, 80);
    expect(dynamicCriteria.length).toBeGreaterThan(0);
    for (const d of dynamicCriteria) {
      expect(d.score).toBeGreaterThanOrEqual(85);
      // The regression: high score, "Still thin" text.
      expect(d.rationale).not.toMatch(/still thin/i);
      expect(d.suggestion).not.toMatch(/can't guess wrong/i);
    }
  });

  it("matches the feedback band to the score for every dimension", () => {
    for (const history of [THIN, SHARP]) {
      for (const d of demoAssessment(history, null, 80).dynamicCriteria) {
        if (d.score >= 85) expect(d.rationale).toMatch(/sharp/i);
        else if (d.score >= 60) expect(d.rationale).toMatch(/taking shape/i);
        else expect(d.rationale).toMatch(/still thin/i);
      }
    }
  });

  it("names the dimension in its own feedback", () => {
    for (const d of demoAssessment(SHARP, null, 80).dynamicCriteria) {
      expect(d.rationale.toLowerCase()).toContain(d.label.toLowerCase());
      expect(d.suggestion.toLowerCase()).toContain(d.label.toLowerCase());
    }
  });

  it("reuses the criteria it is handed instead of re-detecting them", () => {
    const prior = [
      { key: "custom_one", label: "Custom one", bestPractice: "custom_one" },
      { key: "custom_two", label: "Custom two", bestPractice: "custom_two" },
    ];
    const { dynamicCriteria } = demoAssessment(SHARP, prior, 80);
    expect(dynamicCriteria.map((d) => d.key)).toEqual(["custom_one", "custom_two"]);
  });

  it("clears the ready bar on a sharpened pitch but not a thin one", () => {
    expect(demoAssessment(THIN, null, 80).ready).toBe(false);
    expect(demoAssessment(SHARP, null, 80).ready).toBe(true);
  });

  it("carries the threshold it was given", () => {
    expect(demoAssessment(SHARP, null, 55).threshold).toBe(55);
  });

  it("builds a refined prompt that names the project type", () => {
    const a = demoAssessment(SHARP, null, 80);
    expect(a.refinedPrompt).toContain(a.projectType.toLowerCase());
    expect(a.refinedPrompt.length).toBeGreaterThan(40);
  });

  it("survives an empty history without throwing", () => {
    const a = demoAssessment([], null, 80);
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.dynamicCriteria.length).toBeGreaterThan(0);
  });
});

describe("demoLesson", () => {
  it("returns a filled-in lesson for short and long sessions alike", () => {
    for (const history of [THIN, SHARP]) {
      const lesson = demoLesson(history);
      expect(lesson.title).toBeTruthy();
      expect(lesson.lesson.length).toBeGreaterThan(20);
      expect(lesson.why.length).toBeGreaterThan(20);
    }
  });

  it("varies the reason with how long the builder worked", () => {
    expect(demoLesson(THIN).why).not.toBe(demoLesson(SHARP).why);
  });
});
