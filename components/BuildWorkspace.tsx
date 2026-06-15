"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BoardLesson,
  BuildPlan,
  BuildPart,
  BuilderProfile,
  ChatMessage,
  Checkpoint,
  Lesson,
} from "@/lib/types";
import {
  fetchBoardLesson,
  fetchBuildLesson,
  fetchExtendPart,
  fetchLesson,
  fetchPlan,
  fetchQuiz,
  requestExport,
} from "@/lib/clientApi";
import { downloadText } from "@/lib/format";
import {
  addConcept,
  defaultProfile,
  levelFromXp,
  levelProgress,
  loadProfile,
  saveProfile,
  xpPerPart,
  XP_PER_CORRECT,
} from "@/lib/profile";
import { CheckpointQuiz } from "./CheckpointQuiz";
import { CodeLesson } from "./CodeLesson";
import { CodeViewer } from "./CodeViewer";
import { LessonCard } from "./LessonCard";
import { Whiteboard } from "./Whiteboard";
import { ArrowIcon, CheckIcon, CloseIcon, SendIcon, SparkIcon } from "./icons";

const CONFETTI_COLORS = ["#ff6b35", "#ffb020", "#4cc9e6", "#41d49a", "#ff8a5b"];

// Pre-computed once at module load so Confetti renders are pure.
const CONFETTI_PARTICLES = Array.from({ length: 26 }, () => ({
  left: Math.random() * 100,
  delay: Math.random() * 0.25,
  dur: 1 + Math.random() * 0.9,
  size: 6 + Math.random() * 9,
}));

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

type Stage = "profile" | "planning" | "walkthrough" | "board" | "lesson" | "checkpoint" | "done";

/* ----------------------------- small parts ----------------------------- */

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {CONFETTI_PARTICLES.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-14px",
            width: p.size,
            height: p.size,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            borderRadius: i % 2 ? "50%" : "2px",
            animation: `confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
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

  const [board, setBoard] = useState<BoardLesson | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);

  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [builderUrl, setBuilderUrl] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);

  // "keep building" + code viewer
  const [extendInput, setExtendInput] = useState("");
  const [extending, setExtending] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const [nameField, setNameField] = useState("");
  const [gameField, setGameField] = useState("");
  const [loadMsg, setLoadMsg] = useState(0);

  const startedRef = useRef(false);
  const codeRef = useRef("");
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    if (!loadingLesson && !loadingBoard) return;
    setLoadMsg(0);
    const id = setInterval(() => setLoadMsg((m) => m + 1), 2600);
    return () => clearInterval(id);
  }, [loadingLesson, loadingBoard]);

  const awardXp = useCallback((delta: number, patch?: Partial<BuilderProfile>) => {
    setProfile((prev) => {
      const np: BuilderProfile = { ...prev, ...patch, xp: prev.xp + delta };
      saveProfile(np);
      return np;
    });
  }, []);

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

  // Approve the part → open the WHITEBOARD (teach the idea before any code).
  const startBoard = useCallback(async () => {
    if (!plan) return;
    const part = plan.parts[partIndex];
    setLoadingBoard(true);
    setError(null);
    try {
      const bl = await fetchBoardLesson({
        projectName: plan.projectName,
        bigPicture: plan.bigPicture,
        part: { title: part.title, whatItIs: part.whatItIs, concept: part.concept, buildSpec: part.buildSpec },
        partNumber: partIndex + 1,
        totalParts: plan.parts.length,
        name: profile.name,
        favoriteGame: profile.favoriteGame,
      });
      if (!bl.steps || bl.steps.length === 0) throw new Error("The board came back empty — try again.");
      setBoard(bl);
      setStage("board");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't set up the whiteboard.");
    } finally {
      setLoadingBoard(false);
    }
  }, [plan, partIndex, profile.name, profile.favoriteGame]);

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
        part: { title: part.title, whatItIs: part.whatItIs, concept: part.concept, buildSpec: part.buildSpec },
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

  // Lesson finished → commit code, award build XP, then go to the checkpoint quiz.
  const completeLesson = useCallback(
    async (finalCode: string, newCode: string) => {
      if (!plan) return;
      const part = plan.parts[partIndex];
      setCode(finalCode);
      setActiveLesson(null);

      setCelebrate(true);
      setXpToast(`+${xpPerPart} XP · ${part.concept}`);
      awardXp(xpPerPart, {
        conceptsLearned: addConcept(profile.conceptsLearned, part.concept),
        partsBuilt: profile.partsBuilt + 1,
      });
      setTimeout(() => setCelebrate(false), 1500);
      setTimeout(() => setXpToast(null), 2300);

      // Build the grounded checkpoint quiz from the code just written.
      setStage("checkpoint");
      setCheckpoint(null);
      setQuizLoading(true);
      try {
        const cp = await fetchQuiz({
          projectName: plan.projectName,
          refinedPrompt,
          partTitle: part.title,
          concept: part.concept,
          newCode: newCode || finalCode,
          name: profile.name,
        });
        setCheckpoint(cp.questions.length > 0 ? cp : null);
      } catch {
        setCheckpoint(null); // non-fatal: allow continuing without a quiz
      } finally {
        setQuizLoading(false);
      }
    },
    [plan, partIndex, refinedPrompt, profile.name, profile.conceptsLearned, profile.partsBuilt, awardXp],
  );

  // After the quiz → award bonus XP, then advance to next part or finish.
  const afterCheckpoint = useCallback(
    async (correct: number, total: number) => {
      const bonus = correct * XP_PER_CORRECT;
      if (bonus > 0) {
        setXpToast(`+${bonus} XP · ${correct}/${total} correct`);
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 1400);
        setTimeout(() => setXpToast(null), 2300);
      }
      const aced = total > 0 && correct === total;
      awardXp(bonus, aced ? { quizzesAced: profile.quizzesAced + 1 } : undefined);
      setCheckpoint(null);

      if (!plan) return;
      if (partIndex >= plan.parts.length - 1) {
        awardXp(0, { projectsBuilt: profile.projectsBuilt + 1 });
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
    [plan, partIndex, messages, profile.quizzesAced, profile.projectsBuilt, awardXp],
  );

  // "Keep building": turn a request into a new part, append it, and teach it.
  const keepBuilding = async () => {
    const req = extendInput.trim();
    if (!req || !plan || extending) return;
    setExtending(true);
    setError(null);
    try {
      const part = await fetchExtendPart({
        projectName: plan.projectName,
        refinedPrompt,
        request: req,
        currentCode: codeRef.current,
        knownConcepts: profile.conceptsLearned,
      });
      const newIndex = plan.parts.length;
      setPlan({ ...plan, parts: [...plan.parts, part] });
      setPartIndex(newIndex);
      setExtendInput("");
      setStage("walkthrough");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that — try describing it differently.");
    } finally {
      setExtending(false);
    }
  };

  const currentPart = plan?.parts[partIndex];

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="relative flex flex-col gap-5">
      {celebrate && <Confetti />}

      {/* Code viewer modal */}
      {showCode && code && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-base/80 p-4 backdrop-blur" onClick={() => setShowCode(false)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink">Your full code</h3>
              <button
                type="button"
                onClick={() => setShowCode(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:text-ink"
                aria-label="Close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <CodeViewer code={code} filename="my-app.html" maxHeightClass="max-h-[72vh]" />
          </div>
        </div>
      )}

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
            <>
              <button
                type="button"
                onClick={() => setShowCode(true)}
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ember/40"
              >
                {"</>"} See code
              </button>
              <button
                type="button"
                onClick={() => downloadText("my-app.html", code)}
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ember/40"
              >
                ↓ Save
              </button>
            </>
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

      {/* WALKTHROUGH */}
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

            {loadingBoard ? (
              <div className="mt-5 rounded-xl border border-steel/30 bg-base/40 p-5 text-center">
                <div className="mb-2 animate-float text-3xl">🖍️</div>
                <p className="font-display text-base font-bold text-ink">Coach Spark is heading to the whiteboard…</p>
                <div className="mx-auto mt-3 h-1.5 w-44 overflow-hidden rounded-full bg-panel2">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-steel to-good" />
                </div>
                <p className="mt-2 text-xs text-muted">
                  We&apos;ll sketch out <span className="text-ink">{currentPart.title}</span> before writing any code.
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void startBoard()}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-steel to-good px-5 py-3.5 font-display text-lg font-bold text-base shadow-glow transition-transform hover:scale-[1.02]"
                >
                  Teach me at the board! 🖍️
                </button>
                <p className="mt-2 text-center text-xs text-muted">
                  First we&apos;ll plan it on the whiteboard — ask anything — then we write the real code together.
                </p>
              </>
            )}
            {error && <p className="mt-2 text-center text-sm text-warn">{error}</p>}
          </div>
        </div>
      )}

      {/* BOARD — whiteboard teaching before code */}
      {stage === "board" && plan && board && currentPart && (
        <div className="flex flex-col gap-3">
          <PlanMap plan={plan} partIndex={partIndex} />
          <Whiteboard
            board={board}
            projectName={plan.projectName}
            part={{ title: currentPart.title, concept: currentPart.concept }}
            partNumber={partIndex + 1}
            totalParts={plan.parts.length}
            voiceOn={voiceOn}
            onToggleVoice={() => setVoiceOn((v) => !v)}
            onReadyToCode={() => void startLesson()}
          />
          {loadingLesson && (
            <p className="text-center text-sm text-muted">
              <span className="mr-2">⌨️</span>
              Getting the code ready…
            </p>
          )}
          {error && <p className="text-center text-sm text-warn">{error}</p>}
        </div>
      )}

      {/* LESSON */}
      {stage === "lesson" && plan && activeLesson && (
        <div className="flex flex-col gap-3">
          <PlanMap plan={plan} partIndex={partIndex} />
          <CodeLesson
            lesson={activeLesson}
            projectName={plan.projectName}
            partNumber={partIndex + 1}
            totalParts={plan.parts.length}
            voiceOn={voiceOn}
            onToggleVoice={() => setVoiceOn((v) => !v)}
            onComplete={completeLesson}
          />
        </div>
      )}

      {/* CHECKPOINT QUIZ */}
      {stage === "checkpoint" && plan && (
        <div className="flex flex-col gap-4">
          <PlanMap plan={plan} partIndex={partIndex} />
          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted">your app so far</span>
                <span className="font-mono text-[11px] text-good">▶ live</span>
              </div>
              <iframe
                title="App so far"
                sandbox="allow-scripts"
                srcDoc={code}
                className="h-[52vh] w-full rounded-xl border border-line bg-white"
              />
            </div>

            <div>
              {quizLoading ? (
                <div className="grid h-full min-h-[40vh] place-items-center rounded-2xl border border-steel/30 bg-panel/40 text-center">
                  <div>
                    <div className="mb-2 animate-float text-4xl">🧪</div>
                    <p className="font-display text-base font-bold text-ink">Cooking up a quick challenge…</p>
                    <p className="mt-1 text-xs text-muted">about the code you just wrote</p>
                  </div>
                </div>
              ) : checkpoint ? (
                <CheckpointQuiz checkpoint={checkpoint} onDone={afterCheckpoint} />
              ) : (
                <div className="grid h-full min-h-[40vh] place-items-center rounded-2xl border border-line bg-panel/40 text-center">
                  <div>
                    <p className="text-ink">No quiz this round — onward!</p>
                    <button
                      type="button"
                      onClick={() => void afterCheckpoint(0, 0)}
                      className="mt-4 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-2.5 font-semibold text-base shadow-glow"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DONE */}
      {stage === "done" && plan && (
        <div className="flex flex-col gap-5">
          <div className="animate-pop rounded-2xl border border-good/40 bg-gradient-to-b from-good/10 to-panel/40 p-5 text-center">
            <div className="text-4xl">🎉</div>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">You built {plan.projectName}!</h2>
            {profile.conceptsLearned.length > 0 && (
              <p className="mt-1 text-sm text-muted">You learned: {profile.conceptsLearned.slice(-8).join(" · ")}</p>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="overflow-hidden rounded-xl border border-line">
              <div className="flex items-center justify-between border-b border-line/70 px-4 py-2 font-mono text-[11px] text-muted">
                <span>your app — running</span>
                <button type="button" onClick={() => setShowCode(true)} className="text-steel hover:text-ink">
                  {"</>"} see the code
                </button>
              </div>
              <iframe title="Final app" sandbox="allow-scripts" srcDoc={code} className="h-[58vh] w-full bg-white" />
            </div>

            <div className="flex flex-col gap-4">
              <LessonCard lesson={lesson} loading={lessonLoading} />

              {/* KEEP BUILDING */}
              <div className="rounded-2xl border border-ember/30 bg-gradient-to-b from-ember/10 to-panel/40 p-4">
                <div className="mb-1.5 flex items-center gap-1.5 font-display text-base font-bold text-ink">
                  <SparkIcon className="h-4 w-4 text-ember" /> Keep building
                </div>
                <p className="mb-2 text-xs text-muted">
                  Add a new feature — Coach Spark plans it, teaches it, and you build it (and earn more XP).
                </p>
                <div className="flex items-end gap-2">
                  <textarea
                    value={extendInput}
                    disabled={extending}
                    onChange={(e) => setExtendInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void keepBuilding();
                      }
                    }}
                    rows={1}
                    placeholder={extending ? "Planning it…" : "e.g. add a search bar, add sound, add a dark mode toggle…"}
                    className="min-w-0 flex-1 resize-none rounded-lg border border-line bg-base/50 px-3 py-2 text-[15px] text-ink placeholder:text-muted/70 focus:border-ember focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void keepBuilding()}
                    disabled={extending || !extendInput.trim()}
                    className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep text-base shadow-glow transition-transform hover:scale-105 disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none disabled:hover:scale-100"
                    aria-label="Add feature"
                  >
                    {extending ? <span className="h-2 w-2 animate-pulse rounded-full bg-base" /> : <SendIcon className="h-5 w-5" />}
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
