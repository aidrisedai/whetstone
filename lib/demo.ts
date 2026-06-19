import type {
  Assessment,
  BoardItem,
  BoardLesson,
  BuildLesson,
  BuildPart,
  ChatMessage,
  Checkpoint,
  CoachNote,
  CodeBeat,
  CriterionSpec,
  EditResult,
  Lesson,
} from "./types";
import { finalizeAssessment } from "./scoring";

/**
 * Deterministic stand-ins used when no ANTHROPIC_API_KEY is configured, so the
 * entire Whetstone flow — pushback, a climbing scoreboard, auto-export, and a
 * closing lesson — is fully explorable with zero setup. Scores rise as the
 * builder engages, so a few substantive turns will cross the export threshold.
 */

const STOPWORDS = new Set([
  "this","that","with","your","have","want","make","like","just","really","about",
  "would","could","there","their","which","while","being","going","thing","things",
  "people","something","because","build","building","idea","project","need","help",
]);

function lastUserText(history: ChatMessage[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "user") return history[i].content || "";
  }
  return "";
}

function salientWord(text: string): string {
  const words = text.toLowerCase().match(/[a-z]{4,}/g) || [];
  const candidates = words.filter((w) => !STOPWORDS.has(w));
  if (candidates.length === 0) return "that part";
  return candidates.sort((a, b) => b.length - a.length)[0];
}

const PUSHBACKS = [
  (k: string) => `Okay — but "${k}" is doing a lot of hidden work here. Who exactly is this for, and what can they do with it that they can't do today?`,
  (k: string) => `I hear the ambition. Now make it sharp: when someone uses "${k}", what's the ONE thing they walk away having done?`,
  (k: string) => `You're describing features, not a decision. If you could only ship one piece of "${k}" first, which one — and why that one?`,
  (_k: string) => `Good, that's tighter. But what does "done" look like? Give me the moment a user thinks "yes, this worked."`,
  (k: string) => `Now you're getting somewhere. Where does the data or content behind "${k}" actually come from?`,
  (_k: string) => `Cleaner. So what are you deliberately NOT building in v1? Name the thing you're cutting.`,
];

export function demoAdvisorReply(history: ChatMessage[], closing: boolean): string {
  if (closing) {
    return `That's sharp enough to build. What you did best: you stopped hiding behind big words and started naming the exact person you're building for. Keep that habit — clarity isn't decoration, it's leverage. Now go forge it.`;
  }
  const hasImage = history.some((m) => m.role === "user" && (m.images?.length ?? 0) > 0);
  const turns = history.filter((m) => m.role === "user").length;
  const k = salientWord(lastUserText(history));
  if (hasImage && turns <= 2) {
    return `I can see the sketch — the layout reads like a feed with a big action button. But a screen isn't a decision: tell me what a user is supposed to DO on it in the first ten seconds.`;
  }
  const pick = PUSHBACKS[Math.min(turns - 1, PUSHBACKS.length - 1)] ?? PUSHBACKS[0];
  return pick(k);
}

const PROJECT_PROFILES: { match: RegExp; type: string; criteria: CriterionSpec[] }[] = [
  {
    match: /\b(game|play|player|level|score|puzzle|arcade)\b/i,
    type: "Game",
    criteria: [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Win / lose state", bestPractice: "success_criteria" },
      { key: "specify_output_format", label: "Look & feel", bestPractice: "specify_output_format" },
    ],
  },
  {
    match: /\b(chatbot|assistant|bot|ai|tutor|companion|agent)\b/i,
    type: "AI assistant",
    criteria: [
      { key: "assign_role_or_persona", label: "Persona & voice", bestPractice: "assign_role_or_persona" },
      { key: "data_and_sources", label: "Knowledge & sources", bestPractice: "data_and_sources" },
      { key: "handle_edge_cases", label: "Edge cases", bestPractice: "handle_edge_cases" },
    ],
  },
  {
    match: /\b(data|track|tracker|dashboard|analytics|chart|graph|budget|stats)\b/i,
    type: "Data tool",
    criteria: [
      { key: "data_and_sources", label: "Data & sources", bestPractice: "data_and_sources" },
      { key: "specify_output_format", label: "Output & format", bestPractice: "specify_output_format" },
      { key: "success_criteria", label: "Success criteria", bestPractice: "success_criteria" },
    ],
  },
];

const DEFAULT_PROFILE = {
  type: "Web app",
  criteria: [
    { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
    { key: "success_criteria", label: "Success criteria", bestPractice: "success_criteria" },
    { key: "set_constraints_and_scope", label: "Scope & constraints", bestPractice: "set_constraints_and_scope" },
  ] as CriterionSpec[],
};

function detectProfile(history: ChatMessage[]) {
  const allText = history
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
  for (const p of PROJECT_PROFILES) {
    if (p.match.test(allText)) return { type: p.type, criteria: p.criteria };
  }
  return DEFAULT_PROFILE;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function demoAssessment(
  history: ChatMessage[],
  priorCriteria: CriterionSpec[] | null,
  threshold: number,
): Assessment {
  const userMsgs = history.filter((m) => m.role === "user");
  const turns = userMsgs.length;
  const chars = userMsgs.reduce((acc, m) => acc + (m.content?.length ?? 0), 0);
  const richness = clamp01(chars / 700);
  const avgLen = turns ? chars / turns : 0;

  const base = Math.max(10, Math.min(96, Math.round(30 + turns * 8 + richness * 22)));

  const profile = detectProfile(history);
  const criteria = priorCriteria ?? profile.criteria;
  const idea = lastUserText(history)
    .replace(/\s+/g, " ")
    .replace(/^build\s+/i, "")
    .replace(/\.+$/, "")
    .trim();
  const refinedPrompt =
    `Build a ${profile.type.toLowerCase()}. ` +
    (idea ? `Core idea: ${idea}. ` : "") +
    `Target one specific user, define what a successful first session looks like, and keep v1 tightly scoped.`;

  const dynamicOffsets = [-3, 2, -6];

  return finalizeAssessment(
    {
      projectType: profile.type,
      clarity: {
        score: base + 3,
        rationale: turns < 3 ? "The core is still abstract — I can't picture the exact user yet." : "The goal and user are coming into focus.",
        suggestion: "Name the one person this is for and the single job they're hiring it to do.",
      },
      conciseness: {
        score: base - 2 - (avgLen > 320 ? 6 : 0),
        rationale: avgLen > 320 ? "You're packing several ideas into each answer." : "Tight and readable.",
        suggestion: avgLen > 320 ? "Cut to the one sentence that matters most." : "Keep trimming words that don't add signal.",
      },
      dynamicCriteria: criteria.map((c, i) => ({
        ...c,
        score: base + (dynamicOffsets[i] ?? 0),
        rationale: `Still thin on ${c.label.toLowerCase()} — sharpen it to lift this score.`,
        suggestion: `Spell out the ${c.label.toLowerCase()} explicitly so a builder can't guess wrong.`,
      })),
      refinedPrompt,
    },
    threshold,
  );
}

export function demoLesson(history: ChatMessage[]): Lesson {
  const turns = history.filter((m) => m.role === "user").length;
  return {
    title: "Specific beats clever",
    lesson:
      "The fastest way to make any tool — or person — give you what you want is to be ruthlessly specific about who it's for and what 'done' looks like.",
    why:
      turns > 4
        ? "You started vague and got sharper every turn; the score only moved once you named real users and real outcomes instead of features."
        : "Even in a few turns, your idea got stronger the moment you swapped a big word for a concrete one.",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A real, self-contained, interactive starter app for demo mode — a working
 * item tracker (add / toggle / delete, persisted to localStorage), themed to
 * the project. Renders and runs offline in the preview iframe.
 */
export function demoBuildHtml(projectType: string, refinedPrompt: string, changeRequest?: string): string {
  const title = escapeHtml(projectType || "Your app");
  const sub = escapeHtml((refinedPrompt || "Built by Whetstone").slice(0, 150));
  const banner = changeRequest
    ? `<div class="banner">Demo build · applied your note: "${escapeHtml(changeRequest)}"</div>`
    : `<div class="banner">Demo build · set ANTHROPIC_API_KEY for the real Whetstone builder</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0b0d10;color:#eaedf2;display:flex;justify-content:center;padding:24px}
  .app{width:100%;max-width:560px}
  h1{font-size:1.6rem;margin:0 0 4px}
  p.sub{color:#9ba3af;margin:0 0 16px;font-size:.92rem;line-height:1.4}
  .banner{background:#1b1f26;border:1px solid #262b33;border-radius:10px;padding:10px 12px;margin-bottom:16px;color:#ffb020;font-size:.82rem}
  .row{display:flex;gap:8px;margin-bottom:16px}
  input{flex:1;padding:12px;border-radius:10px;border:1px solid #262b33;background:#14171c;color:#eaedf2;font-size:1rem}
  input:focus{outline:2px solid #ff6b35;outline-offset:1px}
  button.add{padding:12px 16px;border:0;border-radius:10px;background:#ff6b35;color:#0b0d10;font-weight:700;cursor:pointer}
  ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
  li{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid #262b33;border-radius:10px;background:#14171c}
  li.done span{text-decoration:line-through;color:#9ba3af}
  li span{flex:1;cursor:pointer}
  .del{background:transparent;border:0;color:#9ba3af;font-size:1.2rem;cursor:pointer;padding:2px 8px}
  .empty{color:#9ba3af;text-align:center;padding:24px}
</style>
</head>
<body>
<div class="app">
  <h1>${title}</h1>
  <p class="sub">${sub}</p>
  ${banner}
  <div class="row">
    <input id="item" placeholder="Add an item and press Enter" aria-label="Add an item">
    <button class="add" id="add">Add</button>
  </div>
  <ul id="list"></ul>
  <p class="empty" id="empty">Nothing yet — add your first item.</p>
</div>
<script>
  (function(){
    var KEY = 'whetstone-demo-items';
    var list = document.getElementById('list');
    var empty = document.getElementById('empty');
    var input = document.getElementById('item');
    function load(){ try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
    function save(items){ localStorage.setItem(KEY, JSON.stringify(items)); }
    function render(){
      var items = load();
      list.innerHTML = '';
      empty.style.display = items.length ? 'none' : 'block';
      items.forEach(function(it, i){
        var li = document.createElement('li');
        if (it.done) li.className = 'done';
        var span = document.createElement('span');
        span.textContent = it.text;
        span.onclick = function(){ items[i].done = !items[i].done; save(items); render(); };
        var del = document.createElement('button');
        del.className = 'del'; del.setAttribute('aria-label', 'Delete'); del.textContent = '\\u00d7';
        del.onclick = function(){ items.splice(i, 1); save(items); render(); };
        li.appendChild(span); li.appendChild(del);
        list.appendChild(li);
      });
    }
    function add(){ var t = input.value.trim(); if (!t) return; var items = load(); items.push({ text: t, done: false }); save(items); input.value = ''; render(); }
    document.getElementById('add').onclick = add;
    input.addEventListener('keydown', function(e){ if (e.key === 'Enter') add(); });
    render();
  })();
</script>
</body>
</html>`;
}

export function demoCoach(step: number, changeRequest: string): CoachNote {
  if (step <= 1) {
    return {
      whatChanged: "Whetstone turned your prompt into a working first version you can actually click around in.",
      concept:
        "Shipping a rough v1 fast teaches you more than another hour of planning — you discover what's missing by using the thing, not imagining it.",
      proTip: "Open it, try the core action once, and name the first thing that feels off. That's your next build step.",
    };
  }
  return {
    whatChanged: changeRequest ? `Applied your change: "${changeRequest}".` : "Applied your latest change.",
    concept:
      "Every change request is a tiny spec — the more concretely you say what you want, the closer the build lands on the first try.",
    proTip: "Ask for one specific change at a time so you can see exactly what each one does.",
  };
}

export function demoEdits(changeRequest: string): EditResult {
  const note = escapeHtml(changeRequest || "your change");
  return {
    summary: `Applied: ${changeRequest}`,
    edits: [
      {
        find: "</body>",
        replace:
          `<div style="position:fixed;left:8px;right:8px;bottom:8px;background:#1b1f26;border:1px solid #262b33;` +
          `color:#ffb020;padding:8px 12px;border-radius:8px;font:13px system-ui">Demo edit · ${note}</div>\n</body>`,
      },
    ],
  };
}

export function demoPlan(
  projectType: string,
  _refinedPrompt: string,
  name: string,
  favoriteGame: string,
): { projectName: string; bigPicture: string; parts: Omit<BuildPart, "id">[] } {
  const who = name ? `${name}, ` : "";
  const gameBit = favoriteGame
    ? ` Think of it like ${favoriteGame}: start simple, then stack on power-ups.`
    : "";
  return {
    projectName: projectType ? `${projectType} Quest` : "Your App Quest",
    bigPicture: `${who}we're building your ${(projectType || "app").toLowerCase()} one piece at a time — and you'll get every single part.${gameBit}`,
    parts: [
      {
        title: "🏗️ The Stage",
        whatItIs: "The main screen with your app's name on it — the empty stage before the show starts.",
        why: "Every app needs a home base first. We build the stage, then put stuff on it.",
        concept: "The screen",
        buildSpec:
          "Create the basic HTML page shell with a styled header showing the app title and an empty main area.",
      },
      {
        title: "✍️ Add Stuff",
        whatItIs: "A box where you type something and a button that pops it onto a list on the screen.",
        why: "An app is boring if you can't DO anything — this is the first thing the user actually controls.",
        concept: "User input",
        buildSpec:
          "Add a text input + 'Add' button that appends the typed item to a visible list; Enter key also adds.",
      },
      {
        title: "🗄️ The Memory Box",
        whatItIs: "Your app remembers your stuff even after you close it. Actual magic.",
        why: "Real apps don't forget. We save the list so it's still there tomorrow.",
        concept: "Saving data",
        buildSpec: "Persist the list to localStorage, reload it on page load, and allow deleting items.",
      },
    ],
  };
}

/* ---- Demo build lesson: real narrated beats that grow a tiny app ---- */

function beat(label: string, lang: CodeBeat["lang"], code: string, say: string, isNew: boolean): CodeBeat {
  return { label, lang, code, say, isNew };
}

// Part 1 beats: a complete minimal HTML file showing a list.
function demoPart1Beats(title: string): CodeBeat[] {
  return [
    beat(
      "🏗️ The page skeleton",
      "html",
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n`,
      "Every web page starts the same way. `<!DOCTYPE html>` tells the browser \"this is modern HTML\", and the `<head>` is backstage — the `<title>` is the name on the browser tab. The `viewport` line is the secret to it looking right on a phone.",
      true,
    ),
    beat(
      "🎨 The look",
      "css",
      `<style>\n  body{font-family:system-ui;background:#10131a;color:#eee;max-width:480px;margin:0 auto;padding:20px}\n  h1{font-size:1.4rem}\n  li{background:#1b2030;margin:6px 0;padding:10px;border-radius:8px;list-style:none}\n</style>\n</head>\n`,
      "This `<style>` block is the paint. Each rule picks a tag — `body`, `h1`, `li` — and restyles it. `max-width:480px` + `margin:0 auto` is the trick that centers everything in a neat column instead of stretching across the whole screen.",
      true,
    ),
    beat(
      "📦 The list on screen",
      "html",
      `<body>\n<h1>${title}</h1>\n<ul id="list"></ul>\n`,
      "Now the visible stuff. `<h1>` is the big heading. That `<ul id=\"list\">` is an empty box with a name tag (`id=\"list\"`) — empty for now, but our code is about to find it by that name and fill it up.",
      true,
    ),
    beat(
      "🧠 Giving it data",
      "js",
      `<script>\n  const items = ["First thing","Second thing"];\n  const list = document.getElementById("list");\n`,
      "Here's where it comes alive. `items` is an array — think of it like an inventory slot list holding our data. `document.getElementById(\"list\")` reaches into the page and grabs that `<ul>` by its name so we can control it from code.",
      true,
    ),
    beat(
      "🔁 Drawing every item",
      "js",
      `  items.forEach(function(text){\n    const li = document.createElement("li");\n    li.textContent = text;\n    list.appendChild(li);\n  });\n</script>\n</body>\n</html>`,
      "`forEach` runs the same code once for every item — a loop. For each one we `createElement(\"li\")` (make a new row), set its text, and `appendChild` to drop it into the list. Two items in the array means two rows appear. Change the array, change the screen!",
      true,
    ),
  ];
}

export function demoBuildLesson(args: {
  part: { title: string; whatItIs: string; concept: string; buildSpec: string };
  partNumber: number;
  currentCode: string;
  projectName: string;
}): BuildLesson {
  const title = escapeHtml(args.projectName || "My App");

  if (args.partNumber <= 1 || !args.currentCode.trim()) {
    return {
      partTitle: args.part.title,
      intro: "Alright — let's write the very first code and get something on the screen! 🚀",
      beats: demoPart1Beats(title),
      outro: "Boom — your app shows a list! You just learned how an array of data becomes rows on a screen with a loop.",
      concept: args.part.concept || "Loops & the DOM",
    };
  }

  // Later parts in demo mode: show the existing file as one carried-over beat,
  // then a new beat that injects a small feature before </body> (always valid).
  const code = args.currentCode;
  const splitAt = code.lastIndexOf("</body>");
  const head = splitAt >= 0 ? code.slice(0, splitAt) : code;
  const tail = splitAt >= 0 ? code.slice(splitAt) : "";
  const featureLabel = escapeHtml(args.part.title);
  const newCode = `<div style="margin-top:14px;padding:10px;background:#26203a;border-radius:8px">✨ ${featureLabel} — wired up in demo mode</div>\n`;

  return {
    partTitle: args.part.title,
    intro: `Time to add ${args.part.title}! We'll keep everything you already built and snap a new piece on top.`,
    beats: [
      beat(
        "🧱 What we have so far",
        "html",
        head,
        "Here's everything from the earlier parts — untouched. Great code doesn't get thrown away; we build ON it. We're going to slip the new piece in right at the end.",
        false,
      ),
      beat(
        "✨ The new piece",
        "html",
        newCode,
        `This new block is ${args.part.title}. In the real (API-key) version Coach Spark writes the actual working code here and explains every line — this is the demo stand-in so you can see the flow.`,
        true,
      ),
      beat("🔚 Closing it up", "html", tail, "We close the tags so the page is valid again. Every tag we open has to close — like brackets in a save file.", false),
    ],
    outro: `Nice — ${args.part.title} is in, and the rest still works. ${args.part.concept ? "You practiced: " + args.part.concept + "." : ""}`,
    concept: args.part.concept || "Building incrementally",
  };
}

/* ---- Demo checkpoint quiz (offline stand-in) ---- */
export function demoQuiz(partTitle: string, _concept: string): Checkpoint {
  return {
    partTitle,
    intro: "Quick checkpoint! Let's see what stuck. 🎯",
    questions: [
      {
        id: "demo-q1",
        question: "When the code calls document.getElementById('list'), what is it doing?",
        codeRef: "const list = document.getElementById('list');",
        options: [
          "Grabbing the element on the page whose id is 'list', so code can control it",
          "Creating a brand-new list element from scratch",
          "Deleting the list from the page",
        ],
        correctIndex: 0,
        explainCorrect: "getElementById finds the existing element by its id so you can read or change it.",
        explainWrong: "Easy mix-up: getElementById finds something already there — it doesn't create or delete it.",
      },
      {
        id: "demo-q2",
        question: "Why do we keep the data in one array and have a single render() draw it?",
        options: [
          "So the screen always matches the data — change the data, re-render, done",
          "Because arrays are the only way to store text",
          "To make the app run slower on purpose",
        ],
        correctIndex: 0,
        explainCorrect: "One source of truth + one render keeps the UI in sync with your data — a pro habit.",
        explainWrong: "Not quite — arrays aren't the only storage; the point is keeping screen and data in sync.",
      },
    ],
  };
}

/* ---- Demo "keep building" part (offline stand-in) ---- */
export function demoExtendPart(request: string): Omit<BuildPart, "id"> {
  const r = request.trim();
  return {
    title: "✨ Your New Feature",
    whatItIs: `The thing you asked for: "${r}". We'll snap it onto your app.`,
    why: "Great builders never stop at v1 — you spotted something to add, and that instinct is the whole game.",
    concept: "Adding a feature",
    buildSpec: `Add the following to the existing app, wired into the current state and render(): ${r}`,
  };
}

/* ---- Demo whiteboard lesson (offline stand-in) ---- */
export function demoBoardLesson(
  part: { title: string; whatItIs: string; concept: string; buildSpec: string },
  projectName: string,
): BoardLesson {
  return {
    partTitle: part.title,
    boardTitle: `${part.title}`,
    steps: [
      {
        say: `Okay! Before we touch any code, let's sketch out ${part.title} so it totally makes sense. Picture this part of ${projectName} like a little machine.`,
        items: [
          { kind: "title", text: part.title, color: "blue", emphasis: true },
          { kind: "fact", text: `${part.concept}: the superpower this part adds`, color: "teal" },
        ],
      },
      {
        say: `The big idea here is "${part.concept}". Let's see it with a quick example before the rule.`,
        items: [
          { kind: "equation", text: "input -> store it -> show it", color: "yellow" },
          { kind: "callout", text: part.concept, emphasis: true },
        ],
        ask: "Why do you think that idea matters for your app?",
      },
      {
        say: "Here's the flow: something happens, and the app reacts. Inputs go in, the screen updates.",
        items: [
          { kind: "box", text: "user does something", color: "pink" },
          { kind: "arrow", text: "action -> app updates", color: "red" },
          { kind: "box", text: "screen shows the change", color: "green" },
        ],
      },
      {
        say: "When we code it, this whole sketch becomes real. You'll recognize every piece because we drew it first!",
        items: [{ kind: "note", text: "next: turn this board into real code" }],
      },
    ],
    closing: "Love it. Now let's turn this board into actual working code!",
  };
}

/* ---- Demo board chat reply (offline stand-in) ---- */
export function demoBoardChat(studentSaid: string): { reply: string; boardItem: BoardItem | null } {
  const s = studentSaid.toLowerCase();
  if (s.includes("?") || s.startsWith("what") || s.startsWith("why") || s.startsWith("how")) {
    return {
      reply: "Great question! Short version: each piece on the board becomes a small bit of code that does exactly one job — and together they make the feature work. We'll see it click when we build it.",
      boardItem: { kind: "note", text: "every box = a bit of code", emphasis: false },
    };
  }
  return {
    reply: "Nice thinking! That's exactly the right instinct. Let's keep going.",
    boardItem: null,
  };
}

/* ---- Demo: student raises hand during the code lesson ---- */
export function demoCodeAsk(studentSaid: string, beatCode: string): { reply: string; highlightHint: string | null } {
  const firstToken = (beatCode.match(/[A-Za-z_]\w{3,}/) || [])[0] || null;
  const s = studentSaid.toLowerCase();
  if (s.includes("?") || s.startsWith("what") || s.startsWith("why") || s.startsWith("how")) {
    return {
      reply:
        "Good question! This line is doing exactly one job — and once you see it run, it'll click. In the real version I'd explain it line by line. Okay, back to it!",
      highlightHint: firstToken,
    };
  }
  return { reply: "Love that you're thinking about it! Keep that going. Okay, back to the code!", highlightHint: null };
}
