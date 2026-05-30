import type {
  Assessment,
  BuildPart,
  ChatMessage,
  CoachNote,
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
  (k: string) => `Good, that's tighter. But what does "done" look like? Give me the moment a user thinks "yes, this worked."`,
  (k: string) => `Now you're getting somewhere. Where does the data or content behind "${k}" actually come from?`,
  (k: string) => `Cleaner. So what are you deliberately NOT building in v1? Name the thing you're cutting.`,
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
