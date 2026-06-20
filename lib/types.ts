// Shared types used by both the server (API routes) and the client (UI).

export type Role = "user" | "advisor";

export interface ImageAttachment {
  /** MIME type, e.g. "image/png" */
  mediaType: string;
  /** base64-encoded bytes, WITHOUT the `data:...;base64,` prefix */
  data: string;
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  images?: ImageAttachment[];
}

/** A single scored dimension. */
export interface Dimension {
  score: number; // 0-100
  rationale: string;
  suggestion: string;
}

/** A dynamic, project-type-specific dimension drawn from a prompt-engineering best practice. */
export interface DynamicCriterion extends Dimension {
  key: string;
  label: string;
  /** The Claude prompt-engineering best practice this dimension is derived from. */
  bestPractice: string;
}

/** The stable identity of a dynamic criterion, reused across turns so the scoreboard stays consistent. */
export interface CriterionSpec {
  key: string;
  label: string;
  bestPractice: string;
}

/** The full assessment of the current state of a builder's idea. */
export interface Assessment {
  projectType: string;
  clarity: Dimension;
  conciseness: Dimension;
  dynamicCriteria: DynamicCriterion[];
  /** Builder-ready synthesis of the idea in its current best form. */
  refinedPrompt: string;
  /** Deterministically computed mean of every dimension (0-100). */
  overall: number;
  /** Deterministically computed: has the idea crossed the export threshold? */
  ready: boolean;
  threshold: number;
}

/** The single transferable lesson delivered at the end of a session. */
export interface Lesson {
  title: string;
  lesson: string;
  why: string;
}

/** Result of an export to the connected AI builder. */
export interface ExportResult {
  builderName: string;
  builderUrl: string;
  webhook: "sent" | "skipped" | "failed";
}

/** One buildable piece of the project, taught before any code is written. */
export interface BuildPart {
  id: string;
  title: string; // fun, kid-facing, with one emoji
  whatItIs: string; // plain kid language
  why: string; // the engineering-manager reasoning
  concept: string; // short label of the thing they learn
  buildSpec: string; // technical one-liner the builder uses to code it
}

/** The coach's plan, presented and approved part-by-part before coding. */
export interface BuildPlan {
  projectName: string;
  bigPicture: string;
  parts: BuildPart[];
}

/** One teachable chunk of real code, narrated during the build lesson. */
export interface CodeBeat {
  label: string; // short, kid-facing, one emoji (e.g. "🧠 The memory")
  lang: "html" | "css" | "js";
  code: string; // EXACT chunk; beats concatenated in order === the full file
  say: string; // exciting, technical-but-clear narration — the learning
  isNew: boolean; // true = part of THIS part's new code (spotlighted)
}

/** A full "watch me write the code" lesson for one build part. */
export interface BuildLesson {
  partTitle: string;
  intro: string; // hype to kick off this part
  beats: CodeBeat[];
  outro: string; // what they can now do + the concept they nailed
  concept: string; // short technical concept label
}

/** One item drawn on the whiteboard during the teaching stage. */
export interface BoardItem {
  kind: "title" | "bullet" | "box" | "arrow" | "code" | "note" | "callout" | "equation" | "fact";
  text: string;
  /** Highlighter/pen color hint for a hand-drawn look. */
  color?: "blue" | "pink" | "yellow" | "green" | "teal" | "red" | "amber";
  /** For arrow: optional label already in text. Visual emphasis hint. */
  emphasis?: boolean;
}

/** One step of the whiteboard lesson: the teacher draws items + says something. */
export interface BoardStep {
  say: string; // what the teacher SAYS aloud for this step (the teaching)
  items: BoardItem[]; // what appears on the board this step (added cumulatively)
  /** Optional check-for-understanding to ask the student before moving on. */
  ask?: string;
}

/** The whiteboard teaching session for one build part (before any code). */
export interface BoardLesson {
  partTitle: string;
  boardTitle: string; // heading drawn at the top of the board
  steps: BoardStep[];
  closing: string; // teacher's line right before "let's code it"
}

/** One multiple-choice checkpoint question, generated from the real code + prompt. */
export interface QuizQuestion {
  id: string;
  question: string;
  /** A short, exact snippet from THIS app's code the question is about (optional). */
  codeRef?: string;
  options: string[]; // 3-4 options
  correctIndex: number;
  explainCorrect: string; // why the right answer is right
  explainWrong: string; // the common misconception, addressed kindly
}

/** The checkpoint quiz after a build part — tests understanding of what was built. */
export interface Checkpoint {
  partTitle: string;
  intro: string; // playful lead-in
  questions: QuizQuestion[];
}

/** A persistent, growing profile for the young builder (stored client-side). */
export interface BuilderProfile {
  name: string;
  favoriteGame: string;
  xp: number;
  conceptsLearned: string[];
  partsBuilt: number;
  projectsBuilt: number;
  quizzesAced: number;
  createdAt: number;
}
