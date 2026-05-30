"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BuildPlan, BuilderProfile, ChatMessage, Lesson } from "@/lib/types";
import { fetchBuildLesson, fetchEdits, fetchLesson, fetchPlan, requestExport } from "@/lib/clientApi";
import { applyEdits, downloadText } from "@/lib/format";
import {
  addConcept,
  defaultProfile,
  levelFromXp,
  levelProgress,
  loadProfile,
  saveProfile,
  xpPerPart,
} from "@/lib/profile";
import { CodeLesson } from "./CodeLesson";
import { LessonCard } from "./LessonCard";
import { ArrowIcon, CheckIcon, SendIcon, SparkIcon } from "./icons";

const CONFETTI_COLORS = ["#ff6b35", "#ffb020", "#4cc9e6", "#41d49a", "#ff8a5b"];

// Playful, rotating status while the code lesson is being prepared (~45-60s).
const LOAD_LINES = [
  "Sketching out the code…",
  "Choosing the perfect pieces to teach you…",
  "Breaking it into bite-size chunks…",
  "Writing real, working code…",
  "Adding the explanations…",
  "Almost ready — this part's gonna be good…",
];
const LOAD_EMOJI = ["✏️", "🧩", "🍪", "⌨️", "💬", "✨"];

interface BuildWorkspaceProps {
  refinedPrompt: string;
  projectType: string;
  messages: ChatMessage[];
  builderName: string;
  onBack: () => void;
}

type Stage = "profile" | "planning" | "walkthrough" | "lesson" | "done";

/* ----------------------------- small parts ----------------------------- */

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {Array.from({ length: 26 }).map((_, i) => {
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

function PlanMap({ plan, partIndex }: { plan: BuildPlan; partIndex: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {plan.parts.map((p, i) => {
        const status = i < partIndex ? "done" : i === partIndex ? "current" : "locked";
        return (
          <div
            key={p.id}
            className={[
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              status === "done"
                ? "border-good/40 bg-good/10 text-good"
                : status === "current"
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

/* ----------------------------- main ----------------------------- */

export function BuildWorkspace({ refinedPrompt, projectType, messages, builderName, onBack }: BuildWorkspaceProps) {
  const [stage, setStage] = useState<Stage>("planning");
  const [profile, setProfile] = useState<BuilderProfile>(defaultProfile());
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [partIndex, setPartIndex] = useState(0);

  const [code, setCode] = useState("");
  const [activeLesson, setActiveLesson] = useState<Awaited<ReturnType<typeof fetchBuildLesson>> | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [builderUrl, setBuilderUrl] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [input, setInput] = useState("");
  const [applying, setApplying] = useState(false);

  const [nameField, setNameField] = useState("");
  const [gameField, setGameField] = useState("");
  const [loadMsg, setLoadMsg] = useState(0);

  const startedRef = useRef(false);
  const codeRef = useRef("");
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Rotate playful status lines while the code lesson is being prepared.
  useEffect(() => {
    if (!loadingLesson) return;
    setLoadMsg(0);
    const id = setInterval(() => setLoadMsg((m) => m + 1), 2600);
    return () => clearInterval(id);
  }, [loadingLesson]);

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

  // Approve the current part → fetch the narrated code lesson → enter lesson stage.
  const startLesson = useCallback(async () => {
    if (!plan) return;
    const part = plan.parts[partIndex];
    setLoadingLesson(true);
    setError(null);
    try {
      const bl = await fetchBuildLesson({
        projectName: plan.projectName,
        bigPicture: plan.bigPicture,
        projectType,
        partNumber: partIndex + 1,
        totalParts: plan.parts.length,
        part: {
          title: part.title,
          whatItIs: part.whatItIs,
          concept: part.concept,
          buildSpec: part.buildSpec,
        },
        currentCode: codeRef.current,
        favoriteGame: profile.favoriteGame,
        name: profile.name,
      });
      if (!bl.beats || bl.beats.length === 0) throw new Error("The lesson came back empty — try again.");
      setActiveLesson(bl);
      setStage("lesson");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the code lesson.");
    } finally {
      setLoadingLesson(false);
    }
  }, [plan, partIndex, projectType, profile.favoriteGame, profile.name]);

  // Lesson finished → commit the code, award XP, advance or finish.
  const completeLesson = useCallback(
    async (finalCode: string) => {
      if (!plan) return;
      const part = plan.parts[partIndex];
      setCode(finalCode);
      setActiveLesson(null);

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
      setTimeout(() => setXpToast(null), 2400);

      if (partIndex >= plan.parts.length - 1) {
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
          /* optional */
        } finally {
          setLessonLoading(false);
        }
      } else {
        setPartIndex((v) => v + 1);
        setStage("walkthrough");
      }
    },
    [plan, partIndex, messages],
  );

  const freeChange = async () => {
    const r = input.trim();
    if (!r || !plan || applying) return;
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

      {/* PROFILE */}
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

      {/* PLANNING */}
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

      {/* WALKTHROUGH — teach the part, then approve to enter the code lesson */}
      {stage === "walkthrough" && plan && currentPart && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              <span className="text-ember">{plan.projectName}</span> · the game plan
            </h2>
            <p className="text-sm text-muted">{plan.bigPicture}</p>
          </div>
          <PlanMap plan={plan} partIndex={partIndex} />

          <div className="mx-auto w-full max-w-2xl animate-pop rounded-2xl border border-ember/30 bg-gradient-to-b from-ember/10 to-panel/40 p-6">
            <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-ember">
              Piece {partIndex + 1} of {plan.parts.length} · next up
            </div>
            <h3 className="font-display text-3xl font-bold text-ink">{currentPart.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">{currentPart.whatItIs}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              <span aria-hidden>🧭 </span>
              {currentPart.why}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-steel/30 bg-steel/10 px-3 py-1 text-xs font-semibold text-steel">
              <SparkIcon className="h-3.5 w-3.5" />
              You&apos;ll learn: {currentPart.concept}
            </div>

            {loadingLesson ? (
              <div className="mt-5 rounded-xl border border-ember/30 bg-base/40 p-5 text-center">
                <div className="mb-2 animate-float text-3xl">{LOAD_EMOJI[loadMsg % LOAD_EMOJI.length]}</div>
                <p className="font-display text-base font-bold text-ink">
                  {LOAD_LINES[loadMsg % LOAD_LINES.length]}
                </p>
                <div className="mx-auto mt-3 h-1.5 w-44 overflow-hidden rounded-full bg-panel2">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-amber to-ember" />
                </div>
                <p className="mt-2 text-xs text-muted">
                  Coach Spark is writing real code for <span className="text-ink">{currentPart.title}</span>…
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void startLesson()}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-3.5 font-display text-lg font-bold text-base shadow-glow transition-transform hover:scale-[1.02]"
                >
                  Let&apos;s write the code! ⌨️
                </button>
                <p className="mt-2 text-center text-xs text-muted">
                  We&apos;ll write it together, one piece at a time — you&apos;ll see exactly what each line does.
                </p>
              </>
            )}
            {error && <p className="mt-2 text-center text-sm text-warn">{error}</p>}
          </div>
        </div>
      )}

      {/* LESSON — the learning session while the code is written */}
      {stage === "lesson" && plan && activeLesson && (
        <div className="flex flex-col gap-3">
          <PlanMap plan={plan} partIndex={partIndex} />
          <CodeLesson
            lesson={activeLesson}
            partNumber={partIndex + 1}
            totalParts={plan.parts.length}
            voiceOn={voiceOn}
            onToggleVoice={() => setVoiceOn((v) => !v)}
            onComplete={completeLesson}
          />
        </div>
      )}

      {/* DONE */}
      {stage === "done" && plan && (
        <div className="flex flex-col gap-5">
          <div className="animate-pop rounded-2xl border border-good/40 bg-gradient-to-b from-good/10 to-panel/40 p-5 text-center">
            <div className="text-4xl">🎉</div>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">You built {plan.projectName}!</h2>
            {profile.conceptsLearned.length > 0 && (
              <p className="mt-1 text-sm text-muted">You learned: {profile.conceptsLearned.slice(-6).join(" · ")}</p>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="overflow-hidden rounded-xl border border-line">
              <div className="flex items-center justify-between border-b border-line/70 px-4 py-2 font-mono text-[11px] text-muted">
                <span>your app — running</span>
                <span className="text-good">▶ live</span>
              </div>
              <iframe
                title="Final app"
                sandbox="allow-scripts"
                srcDoc={code}
                className="h-[58vh] w-full bg-white"
              />
            </div>
            <div className="flex flex-col gap-4">
              <LessonCard lesson={lesson} loading={lessonLoading} />

              <div className="rounded-2xl border border-line bg-panel/80 p-2.5">
                <div className="mb-1 px-1 text-xs font-semibold text-muted">Want to change anything?</div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    disabled={applying}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void freeChange();
                      }
                    }}
                    rows={1}
                    placeholder={applying ? "Working…" : "Tell Coach Spark…"}
                    className="min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void freeChange()}
                    disabled={applying || !input.trim()}
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
