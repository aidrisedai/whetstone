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
import { demoAdvisorReply, demoAssessment, demoBuildLesson, demoLesson, demoPlan, demoQuiz } from "./demo";
import { assembleBeats, beatsFormValidDoc } from "./format";
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

  it("does not praise a low conciseness score", () => {
    const thin = demoAssessment(THIN, null, 80).conciseness;
    expect(thin.score).toBeLessThan(65);
    expect(thin.rationale).not.toMatch(/tight and readable/i);
    expect(demoAssessment(SHARP, null, 80).conciseness.rationale).toMatch(/tight and readable/i);
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

  it("keeps the pitch's project type when a later answer mentions another type's keyword", () => {
    const pitch = { id: "u1", role: "user" as const, content: "An app that helps students find study partners." };
    const later = { id: "u2", role: "user" as const, content: "You pick a confidence level and it shows your score." };
    expect(demoAssessment([pitch], null, 80).projectType).toBe("Web app");
    expect(demoAssessment([pitch, later], null, 80).projectType).toBe("Web app");
  });

  it("exports the pitch as the core idea and later answers as detail", () => {
    const pitch = { id: "u1", role: "user" as const, content: "A tracker for my swim team's lap times." };
    const later = { id: "u2", role: "user" as const, content: "Coaches enter times after each practice." };
    const { refinedPrompt } = demoAssessment([pitch, later], null, 80);
    expect(refinedPrompt).toContain("Core idea: A tracker for my swim team's lap times.");
    expect(refinedPrompt).toContain("Coaches enter times after each practice.");
  });

  it("never ends the exported detail mid-sentence when it has to cut", () => {
    const answer = "The planner caps each day at two hours of work and shows overdue items first";
    const a = demoAssessment(
      [{ id: "0", role: "user", content: "A study planner" }, ...Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), role: "user" as const, content: answer }))],
      null,
      80,
    );
    const detail = a.refinedPrompt.split("What the builder pinned down: ")[1].split(". Target one")[0];
    expect(detail.endsWith("overdue items first")).toBe(true);
  });

  it("gives a high clarity score a note that agrees with it", () => {
    const a = demoAssessment(
      Array.from({ length: 6 }, (_, i) => ({ id: String(i), role: "user" as const, content: "x".repeat(200) })),
      null,
      80,
    );
    expect(a.clarity.score).toBeGreaterThanOrEqual(85);
    expect(a.clarity.rationale).not.toMatch(/coming into focus|abstract/);
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

/**
 * The demo plan promises three parts: a screen, a box that adds to a list, and
 * a list that is remembered. Parts two and three used to add a placeholder
 * banner instead, so the "finished" demo app did none of what was planned.
 */
describe("demo build", () => {
  const plan = demoPlan("Web app", "", "Sam", "");
  function buildAll() {
    let code = "";
    const added: string[] = [];
    plan.parts.forEach((part, i) => {
      const lesson = demoBuildLesson({ part, partNumber: i + 1, currentCode: code, projectName: plan.projectName });
      expect(beatsFormValidDoc(lesson.beats)).toBe(true);
      added.push(lesson.beats.filter((b) => b.isNew).map((b) => b.code).join(""));
      code = assembleBeats(lesson.beats);
    });
    return { code, added };
  }

  it("builds what each planned part says it will", () => {
    const { code } = buildAll();
    expect(code).toContain('<form id="add">');
    expect(code).toContain("items.push(text)");
    expect(code).toContain("localStorage.setItem");
    expect(code).toContain("items.splice(index, 1)");
    expect(code).not.toContain("wired up in demo mode");
    expect(code.match(/<\/body>/g)).toHaveLength(1);
  });

  it("keeps the earlier parts' code when a part is added", () => {
    const first = demoBuildLesson({ part: plan.parts[0], partNumber: 1, currentCode: "", projectName: "X" });
    const one = assembleBeats(first.beats);
    const second = demoBuildLesson({ part: plan.parts[1], partNumber: 2, currentCode: one, projectName: "X" });
    expect(assembleBeats(second.beats)).toContain(one.slice(0, one.lastIndexOf("</body>")));
  });

  it("falls back to a labelled stand-in for a part it has no code for", () => {
    const { code } = buildAll();
    const extra = demoBuildLesson({
      part: { title: "Dark mode", whatItIs: "", concept: "Adding a feature", buildSpec: "" },
      partNumber: 4,
      currentCode: code,
      projectName: "X",
    });
    expect(beatsFormValidDoc(extra.beats)).toBe(true);
    expect(assembleBeats(extra.beats)).toContain("Dark mode — wired up in demo mode");
  });

  it("does not double the sparkle when the part title already carries one", () => {
    const { code } = buildAll();
    const extra = demoBuildLesson({
      part: { title: "✨ Your New Feature", whatItIs: "", concept: "Adding a feature", buildSpec: "" },
      partNumber: 4,
      currentCode: code,
      projectName: "X",
    });
    const html = assembleBeats(extra.beats);
    expect(html).toContain("✨ Your New Feature — wired up in demo mode");
    expect(html).not.toContain("✨ ✨");
  });

  it("quizzes each part on the code that part wrote", () => {
    const { added } = buildAll();
    const seen = new Set<string>();
    plan.parts.forEach((part, i) => {
      const quiz = demoQuiz(part.title, part.concept, added[i]);
      expect(quiz.questions.length).toBeGreaterThanOrEqual(2);
      for (const q of quiz.questions) {
        expect(q.correctIndex).toBeLessThan(q.options.length);
        if (q.codeRef) expect(added[i]).toContain(q.codeRef);
        expect(seen.has(q.question)).toBe(false);
        seen.add(q.question);
      }
    });
  });

  it("does not always put the right answer first", () => {
    const { added } = buildAll();
    const answers = plan.parts.flatMap((p, i) => demoQuiz(p.title, p.concept, added[i]).questions.map((q) => q.correctIndex));
    expect(new Set(answers).size).toBeGreaterThan(1);
  });

  it("asks general questions when the code is not the demo's own", () => {
    const quiz = demoQuiz("Dark mode", "Saving data", "<div>something else</div>");
    expect(quiz.questions.every((q) => !q.codeRef)).toBe(true);
  });
});

describe("demoAdvisorReply — things the builder ruled out", () => {
  it("never asks the builder to expand on something they just cut", () => {
    const history: ChatMessage[] = [
      { id: "m1", role: "user", content: "A study timer for middle schoolers" },
      { id: "m2", role: "advisor", content: "Who is it for?" },
      { id: "m3", role: "user", content: "Sixth graders" },
      { id: "m4", role: "advisor", content: "What do they do?" },
      { id: "m5", role: "user", content: "Only a timer and a shop. No accounts, without any leaderboards, and we won't have notifications." },
    ];
    const reply = demoAdvisorReply(history, false);
    expect(reply).not.toMatch(/accounts|leaderboards|notifications/);
    expect(reply).toContain('"timer"');
  });
});

describe("demoAdvisorReply — a long conversation", () => {
  it("never asks the same question twice in a row", () => {
    const history: ChatMessage[] = [];
    let previous = "";
    for (let turn = 0; turn < 20; turn++) {
      history.push({ id: `u${turn}`, role: "user", content: `Answer ${turn} about the parts tracker` });
      const reply = demoAdvisorReply(history, false);
      expect(reply.length).toBeGreaterThan(0);
      expect(reply).not.toBe(previous);
      history.push({ id: `a${turn}`, role: "advisor", content: reply });
      previous = reply;
    }
  });
});
