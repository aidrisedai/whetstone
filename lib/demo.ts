import type { Assessment, ChatMessage, CriterionSpec, Lesson } from "./types";
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
