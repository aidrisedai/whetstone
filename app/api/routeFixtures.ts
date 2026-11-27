/**
 * Valid request bodies for every API route, shared by the demo-mode contract
 * tests (routes.test.ts) and the live-path ones (routes.live.test.ts).
 */

export const post = (handler: (req: Request) => Promise<Response>, body: unknown) =>
  handler(
    new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

export const history = [
  { role: "user", content: "I want to build a habit tracker for teens." },
  { role: "assistant", content: "Who is it for, and what breaks today?" },
  { role: "user", content: "High schoolers who forget which subject to revise." },
];

export const part = {
  title: "The habit list",
  whatItIs: "A list of habits on screen",
  concept: "arrays",
  buildSpec: "Render an array of habit strings into <li> elements.",
};

/** Every route: [name, module path, a valid body, the keys the client reads]. */
export const ROUTES: Array<[string, string, Record<string, unknown>, string[]]> = [
  ["score", "./score/route", { history, priorCriteria: null }, ["projectType", "refinedPrompt", "overall", "ready"]],
  ["lesson", "./lesson/route", { history }, ["title", "lesson", "why"]],
  ["export", "./export/route", { refinedPrompt: "Build a habit tracker." }, ["builderName", "builderUrl"]],
  [
    "coach",
    "./coach/route",
    { refinedPrompt: "Build a habit tracker.", projectType: "web app", step: 1, changeRequest: "" },
    ["whatChanged", "concept", "proTip"],
  ],
  [
    "plan",
    "./plan/route",
    {
      refinedPrompt: "Build a habit tracker.",
      projectType: "web app",
      name: "Sam",
      favoriteGame: "Minecraft",
      knownConcepts: [],
    },
    ["projectName", "bigPicture", "parts"],
  ],
  [
    "board",
    "./board/route",
    {
      projectName: "HabitHero",
      bigPicture: "Track habits",
      part,
      partNumber: 1,
      totalParts: 3,
      name: "Sam",
      favoriteGame: "Minecraft",
    },
    ["partTitle", "boardTitle", "steps"],
  ],
  [
    "board-chat",
    "./board-chat/route",
    {
      projectName: "HabitHero",
      part: { title: part.title, concept: part.concept },
      boardSoFar: "arrays hold many things",
      studentSaid: "why an array?",
    },
    ["reply", "boardItem"],
  ],
  [
    "lesson-build",
    "./lesson-build/route",
    {
      projectName: "HabitHero",
      bigPicture: "Track habits",
      projectType: "web app",
      partNumber: 1,
      totalParts: 3,
      part,
      currentCode: "",
      favoriteGame: "Minecraft",
      name: "Sam",
    },
    ["partTitle", "intro", "beats", "outro", "concept"],
  ],
  [
    "code-ask",
    "./code-ask/route",
    {
      projectName: "HabitHero",
      partTitle: part.title,
      beatLabel: "the array",
      beatCode: "const habits = [];",
      fileSoFar: "<html></html>",
      studentSaid: "what does const mean?",
    },
    ["reply", "highlightHint"],
  ],
  [
    "quiz",
    "./quiz/route",
    {
      projectName: "HabitHero",
      refinedPrompt: "Build a habit tracker.",
      partTitle: part.title,
      concept: "arrays",
      newCode: "const habits = ['read'];",
      name: "Sam",
    },
    ["partTitle", "questions"],
  ],
  [
    "extend",
    "./extend/route",
    {
      projectName: "HabitHero",
      refinedPrompt: "Build a habit tracker.",
      request: "add streaks",
      currentCode: "<html></html>",
      knownConcepts: ["arrays"],
    },
    ["title", "whatItIs", "concept", "buildSpec"],
  ],
  [
    "edit",
    "./edit/route",
    {
      refinedPrompt: "Build a habit tracker.",
      projectType: "web app",
      currentCode: "<html><body><h1>Hi</h1></body></html>",
      changeRequest: "make the heading say Habits",
    },
    ["summary", "edits"],
  ],
];

/** The two streaming routes answer with text, not JSON, so they get their own checks. */
export const STREAMS: Array<[string, string, Record<string, unknown>]> = [
  ["advisor", "./advisor/route", { history, phase: "dialogue" }],
  ["build", "./build/route", { refinedPrompt: "Build a habit tracker.", projectType: "web app" }],
];
