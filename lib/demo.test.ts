import test from "node:test";
import assert from "node:assert/strict";
import {
  demoAdvisorReply,
  demoAssessment,
  demoBoardChat,
  demoCodeAsk,
  demoLesson,
  demoPlan,
  demoQuiz,
} from "./demo.ts";
import type { ChatMessage } from "./types.ts";

function userTurn(content: string): ChatMessage {
  return { id: `u${content.length}`, role: "user", content };
}

test("demoAdvisorReply gives the closing line when closing is true, regardless of history", () => {
  assert.match(demoAdvisorReply([], true), /sharp enough to build/);
});

test("demoAdvisorReply reacts to a fresh image within the first two turns", () => {
  const history: ChatMessage[] = [
    { id: "1", role: "user", content: "here's my sketch", images: [{ mediaType: "image/png", data: "x" }] },
  ];
  assert.match(demoAdvisorReply(history, false), /sketch/);
});

test("demoAdvisorReply pushes back with an escalating question as turns increase", () => {
  const oneTurn = demoAdvisorReply([userTurn("a mobile app for tracking workouts")], false);
  assert.equal(typeof oneTurn, "string");
  assert.equal(oneTurn.length > 0, true);
});

test("demoLesson always returns a title/lesson/why, varying `why` with turn count", () => {
  const short = demoLesson([userTurn("a")]);
  const long = demoLesson([userTurn("a"), userTurn("b"), userTurn("c"), userTurn("d"), userTurn("e")]);
  assert.equal(short.title, "Specific beats clever");
  assert.notEqual(short.why, long.why);
});

test("demoAssessment detects a game project type from the conversation and is deterministic", () => {
  const history = [userTurn("I want to build a puzzle game with levels and a score")];
  const a = demoAssessment(history, null, 80);
  const b = demoAssessment(history, null, 80);
  assert.equal(a.projectType, "Game");
  assert.deepEqual(a, b, "same input must produce the same assessment");
  assert.equal(a.dynamicCriteria.length, 3);
});

test("demoAssessment falls back to Web app when nothing matches a known profile", () => {
  const a = demoAssessment([userTurn("something totally generic and vague")], null, 80);
  assert.equal(a.projectType, "Web app");
});

test("demoAssessment reuses prior criteria keys instead of re-detecting the profile", () => {
  const prior = [{ key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" }];
  const a = demoAssessment([userTurn("a budget tracker dashboard")], prior, 80);
  assert.deepEqual(
    a.dynamicCriteria.map((d) => d.key),
    ["core_mechanic"],
  );
});

test("demoAssessment scores climb with more, richer turns", () => {
  const thin = demoAssessment([userTurn("an app")], null, 80);
  const rich = demoAssessment(
    [
      userTurn("a".repeat(200)),
      userTurn("b".repeat(200)),
      userTurn("c".repeat(200)),
      userTurn("d".repeat(200)),
    ],
    null,
    80,
  );
  assert.equal(rich.overall > thin.overall, true);
});

test("demoPlan produces exactly 3 buildable parts and folds in the builder's name/game", () => {
  const plan = demoPlan("Game", "Build a puzzle game.", "Ari", "Minecraft");
  assert.equal(plan.parts.length, 3);
  assert.match(plan.bigPicture, /Ari/);
  assert.match(plan.bigPicture, /Minecraft/);
});

test("demoQuiz always returns exactly one correct index in range for each question", () => {
  const quiz = demoQuiz("Part 1", "Loops");
  assert.equal(quiz.questions.length > 0, true);
  for (const q of quiz.questions) {
    assert.equal(q.correctIndex >= 0 && q.correctIndex < q.options.length, true);
  }
});

test("demoBoardChat recognizes a question and responds with a board note", () => {
  const { reply, boardItem } = demoBoardChat("What does this do?");
  assert.equal(typeof reply, "string");
  assert.notEqual(boardItem, null);
});

test("demoBoardChat treats a non-question as a comment with no board item", () => {
  const { boardItem } = demoBoardChat("That makes sense.");
  assert.equal(boardItem, null);
});

test("demoCodeAsk surfaces a highlight hint token pulled from the beat's code for a question", () => {
  const { reply, highlightHint } = demoCodeAsk("why does this work?", "const list = document.getElementById('list');");
  assert.equal(typeof reply, "string");
  assert.equal(highlightHint, "const");
});

test("demoCodeAsk returns no highlight hint for a non-question", () => {
  const { highlightHint } = demoCodeAsk("cool!", "const list = 1;");
  assert.equal(highlightHint, null);
});
