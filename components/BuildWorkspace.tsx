"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BuildStep, ChatMessage, Lesson } from "@/lib/types";
import { fetchCoach, fetchEdits, fetchLesson, requestExport, streamBuild } from "@/lib/clientApi";
import { applyEdits, cleanGeneratedHtml, downloadText, uid } from "@/lib/format";
import { LessonCard } from "./LessonCard";
import { ArrowIcon, SendIcon, SparkIcon } from "./icons";

const CHIPS = [
  "Make it look better",
  "Add a key feature",
  "Make it more colorful",
  "Make it mobile-friendly",
];

interface BuildWorkspaceProps {
  refinedPrompt: string;
  projectType: string;
  messages: ChatMessage[];
  builderName: string;
  onBack: () => void;
}

function CoachCard({ step, index }: { step: BuildStep; index: number }) {
  return (
    <div className="rounded-xl border border-line bg-panel/60 p-3.5">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-panel2 font-mono text-[10px] text-muted">
          {index}
        </span>
        <span className="truncate text-xs font-semibold text-ink">{step.request}</span>
      </div>
      {step.noteLoading || !step.note ? (
        <div className="space-y-1.5 pl-7">
          <div className="h-3 w-3/4 animate-pulse rounded bg-panel2" />
          <div className="h-3 w-full animate-pulse rounded bg-panel2" />
        </div>
      ) : (
        <div className="space-y-1.5 pl-7">
          <p className="text-xs text-muted">{step.note.whatChanged}</p>
          <p className="text-[13px] leading-snug text-ink">{step.note.concept}</p>
          <p className="text-xs leading-snug text-ember-soft">
            <span aria-hidden>→ </span>
            {step.note.proTip}
          </p>
        </div>
      )}
    </div>
  );
}

export function BuildWorkspace({
  refinedPrompt,
  projectType,
  messages,
  builderName,
  onBack,
}: BuildWorkspaceProps) {
  const [code, setCode] = useState("");
  const [liveCode, setLiveCode] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [view, setView] = useState<"preview" | "code">("code");
  const [steps, setSteps] = useState<BuildStep[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [builderUrl, setBuilderUrl] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [showLesson, setShowLesson] = useState(false);

  const startedRef = useRef(false);
  const codeRef = useRef("");
  const stepCountRef = useRef(0);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Full-file generation, streamed — used for the first build and as the
  // fallback when a targeted edit doesn't apply cleanly. Returns success.
  const streamFullBuild = useCallback(
    async (request: string): Promise<boolean> => {
      setStreaming(true);
      setView("code");
      setLiveCode("");
      let acc = "";
      try {
        await streamBuild(
          {
            refinedPrompt,
            projectType,
            currentCode: request ? codeRef.current : undefined,
            changeRequest: request || undefined,
          },
          (chunk) => {
            acc += chunk;
            setLiveCode(acc);
          },
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Build failed");
        setStreaming(false);
        return false;
      }
      const cleaned = cleanGeneratedHtml(acc);
      if (!cleaned || cleaned.startsWith("⚠️") || !cleaned.includes("<")) {
        setError(cleaned || "The builder returned nothing usable. Try again.");
        setStreaming(false);
        return false;
      }
      setCode(cleaned);
      setStreaming(false);
      setView("preview");
      return true;
    },
    [refinedPrompt, projectType],
  );

  const runBuild = useCallback(
    async (request: string) => {
      setError(null);
      stepCountRef.current += 1;
      const stepNum = stepCountRef.current;
      const stepId = uid("step");
      setSteps((prev) => [
        ...prev,
        { id: stepId, request: request || "Initial build", note: null, noteLoading: true },
      ]);

      let ok = false;
      if (!request) {
        ok = await streamFullBuild(""); // first build: full file, streamed
      } else {
        // Fast path: targeted find-and-replace edits applied to the current app.
        setApplying(true);
        try {
          const res = await fetchEdits({
            refinedPrompt,
            projectType,
            currentCode: codeRef.current,
            changeRequest: request,
          });
          const { code: next, applied } = applyEdits(codeRef.current, res.edits);
          if (applied > 0) {
            setCode(next);
            setView("preview");
            ok = true;
          }
        } catch {
          /* fall back to a full rebuild below */
        }
        setApplying(false);
        if (!ok) ok = await streamFullBuild(request); // no edit landed → full rebuild
      }

      if (!ok) {
        setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, noteLoading: false } : s)));
        return;
      }

      try {
        const note = await fetchCoach({ refinedPrompt, projectType, step: stepNum, changeRequest: request });
        setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, note, noteLoading: false } : s)));
      } catch {
        setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, noteLoading: false } : s)));
      }
    },
    [refinedPrompt, projectType, streamFullBuild],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void runBuild("");
    requestExport(refinedPrompt)
      .then((r) => setBuilderUrl(r.builderUrl))
      .catch(() => {});
  }, [runBuild, refinedPrompt]);

  const submit = () => {
    const r = input.trim();
    if (!r || streaming || applying) return;
    setInput("");
    void runBuild(r);
  };

  const wrapUp = async () => {
    setShowLesson(true);
    if (lesson || lessonLoading) return;
    setLessonLoading(true);
    try {
      setLesson(await fetchLesson(messages));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lesson failed");
    } finally {
      setLessonLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-ember/40 hover:text-ink"
          >
            ‹ Sharpen
          </button>
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Build · {projectType}</h2>
            <p className="max-w-md truncate text-xs text-muted">{refinedPrompt}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadText("whetstone-app.html", code)}
            disabled={!code}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ember/40 disabled:opacity-40"
          >
            ↓ Download
          </button>
          {builderUrl && (
            <a
              href={builderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ember/40"
            >
              Open in {builderName}
              <ArrowIcon className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Stage */}
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-lg border border-line bg-panel/60 p-0.5">
              {(["preview", "code"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={[
                    "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
                    view === v ? "bg-panel2 text-ink" : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {v}
                </button>
              ))}
            </div>
            <span
              className={[
                "flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest",
                streaming || applying ? "text-amber" : code ? "text-good" : "text-muted",
              ].join(" ")}
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  streaming || applying ? "animate-pulse bg-amber" : code ? "bg-good" : "bg-muted",
                ].join(" ")}
              />
              {streaming ? "building" : applying ? "editing" : code ? "live" : "idle"}
            </span>
          </div>

          <div className="relative h-[60vh] overflow-hidden rounded-xl border border-line">
            {view === "preview" ? (
              code ? (
                <iframe
                  title="App preview"
                  sandbox="allow-scripts"
                  srcDoc={code}
                  className="h-full w-full bg-white"
                />
              ) : (
                <div className="grid h-full place-items-center bg-base/60 p-6 text-center text-sm text-muted">
                  Your app appears here once the first build finishes.
                </div>
              )
            ) : (
              <pre className="h-full overflow-auto bg-base/70 p-4 font-mono text-xs leading-relaxed text-ink">
                {streaming ? liveCode || "Starting the build…" : code || "No code yet."}
                {streaming && <span className="animate-pulse">▌</span>}
              </pre>
            )}
            {applying && (
              <div className="absolute inset-0 grid place-items-center bg-base/70 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm text-ink">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber" />
                  Applying your change…
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-sm text-warn">
              {error}
            </div>
          )}

          {/* Build composer */}
          <div className="rounded-2xl border border-line bg-panel/80 p-2.5 backdrop-blur">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                disabled={streaming || applying}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                placeholder={
                  streaming ? "Building…" : applying ? "Applying…" : "Tell the builder what to change…"
                }
                className="min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none"
              />
              <button
                type="button"
                onClick={submit}
                disabled={streaming || applying || !input.trim()}
                className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep text-base shadow-glow transition-transform hover:scale-105 disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none disabled:hover:scale-100"
                aria-label="Send change"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5 px-1">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={streaming || applying}
                  onClick={() => setInput(c)}
                  className="rounded-full border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-ember/40 hover:text-ink disabled:opacity-40"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Coach rail */}
        <aside className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <SparkIcon className="h-4 w-4 text-amber" />
            <h3 className="font-display text-base font-bold text-ink">Coach</h3>
            <span className="text-xs text-muted">learn as you build</span>
          </div>

          <div className="flex flex-col gap-3">
            {steps.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-panel/40 p-4 text-sm text-muted">
                Each build step comes back with one thing worth learning.
              </p>
            ) : (
              [...steps]
                .map((s, i) => ({ s, i: i + 1 }))
                .reverse()
                .map(({ s, i }) => <CoachCard key={s.id} step={s} index={i} />)
            )}
          </div>

          <div className="mt-1 border-t border-line/60 pt-4">
            <button
              type="button"
              onClick={wrapUp}
              className="w-full rounded-xl border border-steel/30 bg-steel/10 px-4 py-2.5 text-sm font-semibold text-steel transition-colors hover:bg-steel/20"
            >
              Wrap up → my one lesson
            </button>
            {showLesson && (
              <div className="mt-4">
                <LessonCard lesson={lesson} loading={lessonLoading} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
