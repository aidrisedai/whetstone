"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BuildPart, BuildPlan, BuilderProfile, ChatMessage, Lesson } from "@/lib/types";
import { fetchEdits, fetchLesson, fetchPlan, requestExport, streamBuild } from "@/lib/clientApi";
import { applyEdits, cleanGeneratedHtml, downloadText } from "@/lib/format";
import {
  addConcept,
  defaultProfile,
  levelFromXp,
  levelProgress,
  loadProfile,
  saveProfile,
  xpPerPart,
} from "@/lib/profile";
import { LessonCard } from "./LessonCard";
import { ArrowIcon, CheckIcon, SendIcon, SparkIcon } from "./icons";

const CONFETTI_COLORS = ["#ff6b35", "#ffb020", "#4cc9e6", "#41d49a", "#ff8a5b"];

interface BuildWorkspaceProps {
  refinedPrompt: string;
  projectType: string;
  messages: ChatMessage[];
  builderName: string;
  onBack: () => void;
}

/* ----------------------------- small parts ----------------------------- */

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {Array.from({ length: 22 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.25;
        const dur = 1 + Math.random() * 0.9;
        const size = 6 + Math.random() * 9;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: "-14px",
              width: size,
              height: size,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              borderRadius: i % 2 ? "50%" : "2px",
              animation: `confetti-fall ${dur}s ${delay}s ease-in forwards`,
            }}
          />
        );
      })}
    </div>
  );
}

function BuilderBadge({ profile }: { profile: BuilderProfile }) {
  const level = levelFromXp(profile.xp);
  const prog = Math.round(levelProgress(profile.xp) * 100);
  const initial = (profile.name || "B").charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-panel/60 px-3 py-1.5">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-steel to-good font-display text-sm font-bold text-base">
        {initial}
      </div>
      <div className="min-w-[120px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-ink">{profile.name || "Builder"}</span>
          <span className="font-mono text-[10px] font-semibold text-amber">Lv {level}</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber to-ember transition-[width] duration-500"
            style={{ width: `${prog}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function PlanMap({
  plan,
  partIndex,
  building,
}: {
  plan: BuildPlan;
  partIndex: number;
  building: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {plan.parts.map((p, i) => {
        const status =
          i < partIndex ? "done" : i === partIndex ? (building ? "building" : "current") : "locked";
        return (
          <div
            key={p.id}
            className={[
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              status === "done"
                ? "border-good/40 bg-good/10 text-good"
                : status === "current" || status === "building"
                  ? "border-ember/50 bg-ember/15 text-ink"
                  : "border-line bg-panel/40 text-muted",
            ].join(" ")}
          >
            <span>{status === "done" ? "✓" : status === "locked" ? "🔒" : i + 1}</span>
            <span className="max-w-[130px] truncate">{p.title}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ streaming, applying, hasCode }: { streaming: boolean; applying: boolean; hasCode: boolean }) {
  const busy = streaming || applying;
  return (
    <span
      className={[
        "flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest",
        busy ? "text-amber" : hasCode ? "text-good" : "text-muted",
      ].join(" ")}
    >
      <span
        className={["h-1.5 w-1.5 rounded-full", busy ? "animate-pulse bg-amber" : hasCode ? "bg-good" : "bg-muted"].join(" ")}
      />
      {streaming ? "building" : applying ? "updating" : hasCode ? "live" : "idle"}
    </span>
  );
}

function Preview({
  view,
  onView,
  code,
  liveCode,
  streaming,
  applying,
}: {
  view: "preview" | "code";
  onView: (v: "preview" | "code") => void;
  code: string;
  liveCode: string;
  streaming: boolean;
  applying: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-line bg-panel/60 p-0.5">
          {(["preview", "code"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onView(v)}
              className={[
                "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
                view === v ? "bg-panel2 text-ink" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {v === "code" ? "peek at code" : "preview"}
            </button>
          ))}
        </div>
        <StatusPill streaming={streaming} applying={applying} hasCode={!!code} />
      </div>

      <div className="relative h-[58vh] overflow-hidden rounded-xl border border-line">
        {view === "preview" ? (
          code ? (
            <iframe title="App preview" sandbox="allow-scripts" srcDoc={code} className="h-full w-full bg-white" />
          ) : (
            <div className="grid h-full place-items-center bg-base/60 p-6 text-center text-sm text-muted">
              Your app shows up here once the first piece is built. ✨
            </div>
          )
        ) : (
          <pre className="h-full overflow-auto bg-base/70 p-4 font-mono text-xs leading-relaxed text-ink">
            {streaming ? liveCode || "Starting…" : code || "No code yet."}
            {streaming && <span className="animate-pulse">▌</span>}
          </pre>
        )}
        {applying && (
          <div className="absolute inset-0 grid place-items-center bg-base/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm text-ink">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber" />
              Adding it to your app…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- main ----------------------------- */

export function BuildWorkspace({ refinedPrompt, projectType, messages, builderName, onBack }: BuildWorkspaceProps) {
  const [stage, setStage] = useState<"profile" | "planning" | "walkthrough" | "done">("planning");
  const [profile, setProfile] = useState<BuilderProfile>(defaultProfile());
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [partIndex, setPartIndex] = useState(0);

  const [code, setCode] = useState("");
  const [liveCode, setLiveCode] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [view, setView] = useState<"preview" | "code">("preview");

  const [error, setError] = useState<string | null>(null);
  const [builderUrl, setBuilderUrl] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [input, setInput] = useState("");

  // profile-setup local fields
  const [nameField, setNameField] = useState("");
  const [gameField, setGameField] = useState("");

  const startedRef = useRef(false);
  const codeRef = useRef("");
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  const makePlan = useCallback(
    async (p: BuilderProfile) => {
      setStage("planning");
      setError(null);
      try {
        const pl = await fetchPlan({
          refinedPrompt,
          projectType,
          name: p.name,
          favoriteGame: p.favoriteGame,
          knownConcepts: p.conceptsLearned,
        });
        if (!pl.parts.length) throw new Error("The plan came back empty — try again.");
        setPlan(pl);
        setPartIndex(0);
        setCode("");
        setStage("walkthrough");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't draw up the plan.");
      }
    },
    [refinedPrompt, projectType],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const p = loadProfile();
    setProfile(p);
    setNameField(p.name);
    setGameField(p.favoriteGame);
    requestExport(refinedPrompt)
      .then((r) => setBuilderUrl(r.builderUrl))
      .catch(() => {});
    if (p.name) void makePlan(p);
    else setStage("profile");
  }, [makePlan, refinedPrompt]);

  const startFromProfile = () => {
    const p: BuilderProfile = { ...profile, name: nameField.trim(), favoriteGame: gameField.trim() };
    setProfile(p);
    saveProfile(p);
    void makePlan(p);
  };

  const streamFullBuild = useCallback(
    async (spec: string): Promise<boolean> => {
      setStreaming(true);
      setView("code");
      setLiveCode("");
      let acc = "";
      try {
        await streamBuild({ refinedPrompt: spec, projectType }, (chunk) => {
          acc += chunk;
          setLiveCode(acc);
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Build failed");
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
    [projectType],
  );

  const firstSpec = (part: BuildPart, pl: BuildPlan) =>
    `${pl.bigPicture}\n\nThis is the FIRST piece. Build ONLY this now (more pieces come later): ${part.buildSpec}. Make a minimal, clean shell with just this piece working.`;

  const cumulativeSpec = (idx: number, pl: BuildPlan) =>
    `${pl.bigPicture}\n\nBuild these pieces, all working together in ONE self-contained app:\n` +
    pl.parts
      .slice(0, idx + 1)
      .map((p, i) => `${i + 1}. ${p.buildSpec}`)
      .join("\n");

  const addPart = useCallback(
    async (part: BuildPart, idx: number, pl: BuildPlan): Promise<boolean> => {
      setApplying(true);
      let ok = false;
      try {
        const res = await fetchEdits({
          refinedPrompt: pl.bigPicture,
          projectType,
          currentCode: codeRef.current,
          changeRequest: `Add the next piece to the app: ${part.title} — ${part.buildSpec}. Keep every existing piece working and keep it fully self-contained.`,
        });
        const { code: next, applied } = applyEdits(codeRef.current, res.edits);
        if (applied > 0) {
          setCode(next);
          setView("preview");
          ok = true;
        }
      } catch {
        /* fall back below */
      }
      setApplying(false);
      if (!ok) ok = await streamFullBuild(cumulativeSpec(idx, pl));
      return ok;
    },
    [projectType, streamFullBuild],
  );

  const approveAndBuild = useCallback(async () => {
    if (!plan || streaming || applying) return;
    const idx = partIndex;
    const part = plan.parts[idx];
    setError(null);

    const ok = idx === 0 ? await streamFullBuild(firstSpec(part, plan)) : await addPart(part, idx, plan);
    if (!ok) return;

    // Celebrate + grow the profile.
    setCelebrate(true);
    setXpToast(`+${xpPerPart} XP · ${part.concept}`);
    setProfile((prev) => {
      const np: BuilderProfile = {
        ...prev,
        xp: prev.xp + xpPerPart,
        conceptsLearned: addConcept(prev.conceptsLearned, part.concept),
        partsBuilt: prev.partsBuilt + 1,
      };
      saveProfile(np);
      return np;
    });
    setTimeout(() => setCelebrate(false), 1600);
    setTimeout(() => setXpToast(null), 2300);

    if (idx >= plan.parts.length - 1) {
      setProfile((prev) => {
        const np = { ...prev, projectsBuilt: prev.projectsBuilt + 1 };
        saveProfile(np);
        return np;
      });
      setStage("done");
      setLessonLoading(true);
      try {
        setLesson(await fetchLesson(messages));
      } catch {
        /* lesson optional */
      } finally {
        setLessonLoading(false);
      }
    } else {
      setPartIndex(idx + 1);
    }
  }, [plan, partIndex, streaming, applying, streamFullBuild, addPart, messages]);

  const freeChange = async () => {
    const r = input.trim();
    if (!r || !plan || streaming || applying) return;
    setInput("");
    setError(null);
    setApplying(true);
    let ok = false;
    try {
      const res = await fetchEdits({
        refinedPrompt: plan.bigPicture,
        projectType,
        currentCode: codeRef.current,
        changeRequest: r,
      });
      const { code: next, applied } = applyEdits(codeRef.current, res.edits);
      if (applied > 0) {
        setCode(next);
        ok = true;
      }
    } catch {
      /* ignore */
    }
    setApplying(false);
    if (!ok) setError("Hmm, I couldn't make that one — try saying it a different way.");
  };

  const busy = streaming || applying;
  const currentPart = plan?.parts[partIndex];

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="relative flex flex-col gap-5">
      {celebrate && <Confetti />}

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
          <BuilderBadge profile={profile} />
        </div>
        <div className="flex items-center gap-2">
          {xpToast && (
            <span className="animate-pop rounded-full border border-amber/40 bg-amber/15 px-3 py-1 text-xs font-bold text-amber">
              {xpToast}
            </span>
          )}
          {code && (
            <button
              type="button"
              onClick={() => downloadText("my-app.html", code)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ember/40"
            >
              ↓ Save
            </button>
          )}
        </div>
      </div>

      {/* PROFILE SETUP */}
      {stage === "profile" && (
        <div className="mx-auto w-full max-w-md animate-pop py-8 text-center">
          <div className="mb-2 text-5xl">🎮</div>
          <h2 className="font-display text-3xl font-bold text-ink">New builder!</h2>
          <p className="mt-1 text-muted">Two quick things so Coach Spark can hype you up properly.</p>
          <div className="mt-6 space-y-3 text-left">
            <label className="block">
              <span className="text-sm font-semibold text-ink">What should I call you?</span>
              <input
                value={nameField}
                onChange={(e) => setNameField(e.target.value)}
                placeholder="Your name or gamertag"
                className="mt-1 w-full rounded-xl border border-line bg-panel px-4 py-3 text-ink placeholder:text-muted/60 focus:border-ember focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Favorite game?</span>
              <input
                value={gameField}
                onChange={(e) => setGameField(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startFromProfile()}
                placeholder="Minecraft, Roblox, Fortnite…"
                className="mt-1 w-full rounded-xl border border-line bg-panel px-4 py-3 text-ink placeholder:text-muted/60 focus:border-ember focus:outline-none"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={startFromProfile}
            className="mt-6 w-full rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-3.5 font-display text-lg font-bold text-base shadow-glow transition-transform hover:scale-[1.02]"
          >
            Let&apos;s build! ⚡
          </button>
          <button
            type="button"
            onClick={() => void makePlan(profile)}
            className="mt-3 text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            skip for now
          </button>
        </div>
      )}

      {/* PLANNING (loader / error) */}
      {stage === "planning" && (
        <div className="mx-auto w-full max-w-md py-16 text-center">
          {error ? (
            <>
              <div className="mb-3 text-4xl">😅</div>
              <p className="text-ink">{error}</p>
              <button
                type="button"
                onClick={() => void makePlan(profile)}
                className="mt-5 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-2.5 font-semibold text-base shadow-glow"
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <div className="mb-3 animate-float text-5xl">🧠</div>
              <h2 className="font-display text-2xl font-bold text-ink">Coach Spark is drawing up your game plan…</h2>
              <p className="mt-1 text-muted">Breaking your app into pieces you&apos;ll totally get.</p>
              <div className="mx-auto mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-panel2">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-amber to-ember" />
              </div>
            </>
          )}
        </div>
      )}

      {/* WALKTHROUGH */}
      {stage === "walkthrough" && plan && currentPart && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              <span className="text-ember">{plan.projectName}</span> · the game plan
            </h2>
            <p className="text-sm text-muted">{plan.bigPicture}</p>
          </div>
          <PlanMap plan={plan} partIndex={partIndex} building={busy} />

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            {/* Current part card */}
            <div className="animate-pop rounded-2xl border border-ember/30 bg-gradient-to-b from-ember/10 to-panel/40 p-5">
              <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ember">
                Piece {partIndex + 1} of {plan.parts.length}
              </div>
              <h3 className="font-display text-2xl font-bold text-ink">{currentPart.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink">{currentPart.whatItIs}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                <span aria-hidden>🧭 </span>
                {currentPart.why}
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-steel/30 bg-steel/10 px-3 py-1 text-xs font-semibold text-steel">
                <SparkIcon className="h-3.5 w-3.5" />
                You&apos;ll learn: {currentPart.concept}
              </div>

              <button
                type="button"
                onClick={() => void approveAndBuild()}
                disabled={busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-3.5 font-display text-lg font-bold text-base shadow-glow transition-transform hover:scale-[1.02] disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none disabled:hover:scale-100"
              >
                {busy ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-base" />
                    Coach Spark is building it…
                  </>
                ) : (
                  <>Build it! ⚒️</>
                )}
              </button>
              {error && <p className="mt-2 text-sm text-warn">{error}</p>}
            </div>

            {/* Live app */}
            <Preview
              view={view}
              onView={setView}
              code={code}
              liveCode={liveCode}
              streaming={streaming}
              applying={applying}
            />
          </div>
        </div>
      )}

      {/* DONE */}
      {stage === "done" && plan && (
        <div className="flex flex-col gap-5">
          <div className="animate-pop rounded-2xl border border-good/40 bg-gradient-to-b from-good/10 to-panel/40 p-5 text-center">
            <div className="text-4xl">🎉</div>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">
              You built {plan.projectName}!
            </h2>
            <p className="mt-1 text-sm text-muted">
              {profile.conceptsLearned.length > 0 && (
                <>You learned: {profile.conceptsLearned.slice(-6).join(" · ")}</>
              )}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Preview
              view={view}
              onView={setView}
              code={code}
              liveCode={liveCode}
              streaming={streaming}
              applying={applying}
            />
            <div className="flex flex-col gap-4">
              <LessonCard lesson={lesson} loading={lessonLoading} />

              <div className="rounded-2xl border border-line bg-panel/80 p-2.5">
                <div className="mb-1 px-1 text-xs font-semibold text-muted">Want to change anything?</div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    disabled={busy}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void freeChange();
                      }
                    }}
                    rows={1}
                    placeholder={busy ? "Working…" : "Tell Coach Spark…"}
                    className="min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void freeChange()}
                    disabled={busy || !input.trim()}
                    className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep text-base shadow-glow transition-transform hover:scale-105 disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none disabled:hover:scale-100"
                    aria-label="Send change"
                  >
                    <SendIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-warn">{error}</p>}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadText("my-app.html", code)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel2 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ember/40"
                >
                  <CheckIcon className="h-4 w-4 text-good" /> Save my app
                </button>
                {builderUrl && (
                  <a
                    href={builderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel2 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ember/40"
                  >
                    Open in {builderName}
                    <ArrowIcon className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember/40 hover:text-ink"
                >
                  Build something new
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
