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

/** A coaching card delivered after each build step — the learning-while-building. */
export interface CoachNote {
  whatChanged: string;
  concept: string;
  proTip: string;
}

/** One step in the build loop (initial build or an iteration). */
export interface BuildStep {
  id: string;
  request: string; // "Initial build" or the change request
  note: CoachNote | null;
  noteLoading: boolean;
}
