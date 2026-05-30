import { uid } from "./format";
import type {
  Assessment,
  BuildPart,
  BuildPlan,
  ChatMessage,
  CoachNote,
  CriterionSpec,
  EditResult,
  ExportResult,
  Lesson,
} from "./types";

/** Stream the advisor's reply, invoking `onChunk` with each text delta. */
export async function streamAdvisor(
  history: ChatMessage[],
  closing: boolean,
  onChunk: (text: string) => void,
): Promise<void> {
  const res = await fetch("/api/advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history, phase: closing ? "closing" : "dialogue" }),
  });
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Advisor request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) onChunk(decoder.decode(value, { stream: true }));
  }
}

export async function fetchScore(
  history: ChatMessage[],
  priorCriteria: CriterionSpec[] | null,
): Promise<Assessment> {
  const res = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history, priorCriteria }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Scoring failed (${res.status})`);
  }
  return (await res.json()) as Assessment;
}

export async function fetchLesson(history: ChatMessage[]): Promise<Lesson> {
  const res = await fetch("/api/lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Lesson failed (${res.status})`);
  }
  return (await res.json()) as Lesson;
}

export async function requestExport(refinedPrompt: string): Promise<ExportResult> {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refinedPrompt }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Export failed (${res.status})`);
  }
  return (await res.json()) as ExportResult;
}

export interface BuildPayload {
  refinedPrompt: string;
  projectType: string;
  currentCode?: string;
  changeRequest?: string;
}

/** Stream the generated app (HTML), invoking `onChunk` with each delta. */
export async function streamBuild(
  payload: BuildPayload,
  onChunk: (text: string) => void,
): Promise<void> {
  const res = await fetch("/api/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Build request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) onChunk(decoder.decode(value, { stream: true }));
  }
}

export async function fetchCoach(payload: {
  refinedPrompt: string;
  projectType: string;
  step: number;
  changeRequest: string;
}): Promise<CoachNote> {
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Coach failed (${res.status})`);
  }
  return (await res.json()) as CoachNote;
}

/** Fetch the coach's build plan (parts taught before any code), adding stable ids. */
export async function fetchPlan(payload: {
  refinedPrompt: string;
  projectType: string;
  name: string;
  favoriteGame: string;
  knownConcepts: string[];
}): Promise<BuildPlan> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Plan failed (${res.status})`);
  }
  const raw = (await res.json()) as {
    projectName: string;
    bigPicture: string;
    parts: Omit<BuildPart, "id">[];
  };
  return {
    projectName: raw.projectName,
    bigPicture: raw.bigPicture,
    parts: (raw.parts || []).slice(0, 5).map((p) => ({ ...p, id: uid("part") })),
  };
}

/** Fetch targeted find-and-replace edits for a fast iteration. */
export async function fetchEdits(payload: {
  refinedPrompt: string;
  projectType: string;
  currentCode: string;
  changeRequest: string;
}): Promise<EditResult> {
  const res = await fetch("/api/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Edit failed (${res.status})`);
  }
  return (await res.json()) as EditResult;
}
