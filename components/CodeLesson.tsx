"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BuildLesson, CodeBeat } from "@/lib/types";
import { assembleBeats, assembleBeatsUpTo } from "@/lib/format";
import { askDuringCode } from "@/lib/clientApi";
import { useTeacherVoice } from "@/hooks/useTeacherVoice";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Caption } from "./Caption";
import { ArrowIcon, CheckIcon, MicIcon, PauseIcon, PlayIcon, SendIcon, SparkIcon } from "./icons";

const LANG_BADGE: Record<CodeBeat["lang"], { label: string; cls: string }> = {
  html: { label: "HTML", cls: "border-ember/40 bg-ember/10 text-ember" },
  css: { label: "CSS", cls: "border-steel/40 bg-steel/10 text-steel" },
  js: { label: "JS", cls: "border-amber/40 bg-amber/10 text-amber" },
};

/** Small dependency-free syntax tint for tags / strings / keywords. */
function tint(code: string): string {
  let h = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  h = h.replace(/(&quot;|&#39;|"|')(.*?)\1/g, '<span class="tk-str">$1$2$1</span>');
  h = h.replace(
    /\b(const|let|var|function|return|for|forEach|map|filter|if|else|new|document|localStorage|addEventListener|try|catch|JSON)\b/g,
    '<span class="tk-kw">$1</span>',
  );
  h = h.replace(/(&lt;\/?)([a-zA-Z0-9]+)/g, '$1<span class="tk-tag">$2</span>');
  return h;
}

interface CodeLessonProps {
  lesson: BuildLesson;
  projectName: string;
  partNumber: number;
  totalParts: number;
  voiceOn: boolean;
  onToggleVoice: () => void;
  onComplete: (finalCode: string, newCode: string) => void;
}

type ChatMsg = { who: "teacher" | "student"; text: string };

/**
 * The DURING-the-build classroom. Real code grows line by line; the chunk being
 * explained is spotlighted (everything else dims), the teacher narrates with a
 * live caption + voice, and the student can raise their hand to ask about the
 * exact code on screen, then continue. The running app lives in a Browser tab.
 */
export function CodeLesson({
  lesson,
  projectName,
  partNumber,
  totalParts,
  voiceOn,
  onToggleVoice,
  onComplete,
}: CodeLessonProps) {
  const beats = lesson.beats;
  const [i, setI] = useState(-1); // -1 intro; 0..n-1 beats; n outro
  const [tab, setTab] = useState<"code" | "browser">("code");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [caption, setCaption] = useState("");
  const [asking, setAsking] = useState(false); // ask box open
  const [askText, setAskText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState<string | null>(null); // highlightHint substring

  const teacher = useTeacherVoice();
  const mic = useSpeechRecognition();
  const codeScrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef(voiceOn);
  // Precompute cumulative line-number offsets for each beat so render stays pure.
  const lineOffsets = useMemo(() => {
    const lengths = beats.map((b) => b.code.split("\n").length);
    return lengths.map((_, idx) => lengths.slice(0, idx).reduce((s, n) => s + n, 0));
  }, [beats]);
  useEffect(() => {
    voiceRef.current = voiceOn;
    if (!voiceOn) teacher.stop();
  }, [voiceOn, teacher]);

  const onIntro = i < 0;
  const onOutro = i >= beats.length;
  const current = !onIntro && !onOutro ? beats[i] : null;

  const fullCode = useMemo(() => assembleBeats(beats), [beats]);
  const codeSoFar = onOutro ? fullCode : i < 0 ? "" : assembleBeatsUpTo(beats, i);

  const say = useCallback(
    (text: string) => {
      setCaption(text);
      setPaused(false);
      if (voiceRef.current) teacher.speak(text);
    },
    [teacher],
  );

  // When the beat changes, narrate it and (on the final recap) flip to the app.
  useEffect(() => {
    if (onIntro) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChat([{ who: "teacher", text: lesson.intro }]);
      say(lesson.intro);
    } else if (onOutro) {
      setChat((c) => [...c, { who: "teacher", text: lesson.outro }]);
      say(lesson.outro);
      setTab("browser");
    } else if (current) {
      setChat((c) => [...c, { who: "teacher", text: current.say }]);
      say(current.say);
      setTab("code");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // Auto-center the chunk being explained.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [i, tab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mic.listening) setAskText(mic.transcript);
  }, [mic.transcript, mic.listening]);

  const next = () => {
    teacher.stop();
    if (i >= beats.length) {
      const newCode = beats.filter((b) => b.isNew).map((b) => b.code).join("\n");
      onComplete(fullCode, newCode);
      return;
    }
    setI((v) => v + 1);
  };

  function togglePause() {
    if (paused) {
      teacher.resume();
      setPaused(false);
    } else {
      teacher.pause();
      setPaused(true);
    }
  }

  async function submitQuestion() {
    const q = askText.trim();
    if (!q || thinking) return;
    if (mic.listening) mic.stop();
    setAskText("");
    mic.reset();
    teacher.pause();
    setChat((c) => [...c, { who: "student", text: q }]);
    setThinking(true);
    try {
      const res = await askDuringCode({
        projectName,
        partTitle: lesson.partTitle,
        beatLabel: current?.label ?? (onOutro ? "the recap" : "the intro"),
        beatCode: current?.code ?? "",
        fileSoFar: codeSoFar,
        studentSaid: q,
      });
      setChat((c) => [...c, { who: "teacher", text: res.reply }]);
      if (res.highlightHint && current?.code.includes(res.highlightHint)) {
        setFlash(res.highlightHint);
        setTimeout(() => setFlash(null), 2600);
      }
      say(res.reply);
    } catch {
      const oops = "Hmm, ask me that one more time?";
      setChat((c) => [...c, { who: "teacher", text: oops }]);
      say(oops);
    } finally {
      setThinking(false);
      setAsking(false);
    }
  }

  const newCount = beats.filter((b) => b.isNew).length;
  const newDone = beats.slice(0, Math.max(0, i + 1)).filter((b) => b.isNew).length;
  const transcript = chat.slice(-4);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      {/* LEFT: editor / browser */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-[#0c0f15] shadow-[0_18px_50px_-22px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-line/70 px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab("code")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs transition-colors ${
                tab === "code" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {"</>"} app.html
            </button>
            <button
              type="button"
              onClick={() => setTab("browser")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs transition-colors ${
                tab === "browser" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              ▶ Browser
            </button>
          </div>
          <span className="font-mono text-[11px] text-muted">
            {onOutro ? "complete" : onIntro ? "ready" : `step ${i + 1}/${beats.length}`}
          </span>
        </div>

        {tab === "code" ? (
          <div ref={codeScrollRef} className="h-[62vh] overflow-auto py-3">
            {onIntro ? (
              <div className="grid h-full place-items-center text-center">
                <div className="animate-pop">
                  <div className="mb-2 text-4xl">⌨️</div>
                  <p className="font-mono text-sm text-muted">We&apos;ll write the code together, piece by piece…</p>
                </div>
              </div>
            ) : (
              <div className="font-mono text-[12.5px] leading-[1.65]">
                {beats.slice(0, i + 1).map((b, idx) => {
                  const active = idx === i;
                  const lines = b.code.split("\n");
                  return (
                    <div
                      key={idx}
                      ref={active ? activeRef : undefined}
                      className={[
                        "transition-all duration-300",
                        active
                          ? "my-1 border-l-[3px] border-ember bg-ember/10"
                          : "border-l-[3px] border-transparent opacity-40 hover:opacity-70",
                      ].join(" ")}
                    >
                      {active && (
                        <div className="flex items-center gap-2 px-3 pb-1 pt-1.5">
                          <span className="font-display text-[11px] font-bold text-ember">{b.label}</span>
                          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] ${LANG_BADGE[b.lang].cls}`}>
                            {LANG_BADGE[b.lang].label}
                          </span>
                        </div>
                      )}
                      {lines.map((ln, li) => {
                        const n = lineOffsets[idx] + li + 1;
                        let html = tint(ln);
                        if (active && flash && ln.includes(flash)) {
                          // wrap the flashed substring (best-effort, escaped already by tint)
                          const safe = flash.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                          html = html.replace(safe, `<mark class="flash">${safe}</mark>`);
                        }
                        return (
                          <div key={li} className="flex">
                            <span className="w-10 shrink-0 select-none pr-3 text-right text-muted/40">{n}</span>
                            <code
                              className="tk flex-1 whitespace-pre-wrap break-words pr-3"
                              dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-[62vh] flex-col">
            <div className="flex items-center gap-2 border-b border-line/70 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
              <div className="ml-2 flex flex-1 items-center gap-1.5 rounded-md bg-base/60 px-3 py-1">
                <span className="text-good">🔒</span>
                <span className="font-mono text-[11px] text-muted">localhost · your app</span>
                <span className="ml-auto font-mono text-[10px] text-good">▶ live</span>
              </div>
            </div>
            {codeSoFar ? (
              <iframe title="App preview" sandbox="allow-scripts" srcDoc={codeSoFar} className="w-full flex-1 bg-white" />
            ) : (
              <div className="grid flex-1 place-items-center text-sm text-muted">Your app runs here as we write it.</div>
            )}
          </div>
        )}

        {/* Classroom bottom bar: avatar · caption · pause */}
        <div className="flex items-center gap-3 border-t border-line/70 bg-base/40 px-3 py-2.5">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ember-soft to-ember-deep text-white shadow-glow">
            <SparkIcon className="h-5 w-5" />
            {teacher.speaking && <span className="absolute inset-0 animate-ping rounded-full bg-ember/30" />}
          </div>
          <button
            type="button"
            onClick={togglePause}
            title={paused ? "Resume" : "Pause"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted ring-1 ring-line hover:text-ink"
          >
            {paused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">
            {caption ? <Caption text={caption} progress={teacher.progress} /> : <span className="text-sm text-muted">…</span>}
          </div>
        </div>
      </div>

      {/* RIGHT: teacher panel + ask + controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-ink">{lesson.partTitle}</h2>
            <p className="text-xs text-muted">Part {partNumber}/{totalParts} · writing the code</p>
          </div>
          <div className="flex items-center gap-1.5">
            {teacher.hdAvailable === true && (
              <span className="rounded-full border border-good/40 bg-good/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-good">HD</span>
            )}
            <button
              type="button"
              onClick={onToggleVoice}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                voiceOn ? "border-ember/40 bg-ember/15 text-ember" : "border-line text-muted hover:text-ink"
              }`}
            >
              {voiceOn ? "🔊 Voice" : "🔇 Muted"}
            </button>
          </div>
        </div>

        {/* step progress */}
        <div className="flex items-center gap-1.5">
          {beats.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-colors ${idx <= i ? "bg-gradient-to-r from-amber to-ember" : "bg-panel2"}`}
            />
          ))}
        </div>

        {/* conversation (teacher narration + student questions) */}
        <div className="flex-1 space-y-2 overflow-auto rounded-2xl border border-line bg-panel/40 p-3" style={{ maxHeight: "38vh" }}>
          {transcript.map((m, idx) => (
            <div key={idx} className={`flex ${m.who === "student" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-[14px] leading-relaxed ${
                  m.who === "student"
                    ? "rounded-tr-sm bg-steel/15 text-ink ring-1 ring-steel/25"
                    : "rounded-tl-sm border border-line bg-panel text-ink"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm border border-line bg-panel px-3 py-2">
                <span className="inline-flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-typing rounded-full bg-ember" style={{ animationDelay: `${d * 0.16}s` }} />
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Raise-your-hand ask box */}
        {asking || askText ? (
          <div className="rounded-2xl border border-steel/30 bg-steel/5 p-2">
            <div className="mb-1 px-1 text-[11px] font-semibold text-steel">🙋 Ask about this code</div>
            <div className="flex items-end gap-2">
              <textarea
                value={askText}
                autoFocus
                onChange={(e) => setAskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submitQuestion();
                  }
                }}
                rows={1}
                placeholder={mic.listening ? "Listening… ask away" : "e.g. what does this line do?"}
                className="min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none"
              />
              {mic.supported && (
                <button
                  type="button"
                  onClick={() => (mic.listening ? mic.stop() : mic.start(askText))}
                  title={mic.listening ? "Stop" : "Talk"}
                  className={`relative grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                    mic.listening ? "bg-ember text-white" : "text-muted ring-1 ring-line hover:text-ink"
                  }`}
                >
                  <MicIcon className="h-5 w-5" />
                  {mic.listening && <span className="absolute inset-0 animate-ping rounded-xl bg-ember/40" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => void submitQuestion()}
                disabled={thinking || !askText.trim()}
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep text-white shadow-glow transition-transform hover:scale-105 disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none disabled:hover:scale-100"
                aria-label="Ask"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          !onIntro && (
            <button
              type="button"
              onClick={() => {
                teacher.pause();
                setPaused(true);
                setAsking(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-steel/40 bg-steel/10 py-2 text-sm font-semibold text-steel transition-colors hover:bg-steel/20"
            >
              🙋 Raise your hand — ask a question
            </button>
          )
        )}

        {/* advance */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-muted">{newDone}/{newCount} new pieces explained</span>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-2.5 font-display text-base font-bold text-white shadow-glow transition-transform hover:scale-[1.03]"
          >
            {onIntro ? (
              <>Start writing ⌨️</>
            ) : onOutro ? (
              <>{partNumber >= totalParts ? "Finish my app" : "Next part"} <ArrowIcon className="h-4 w-4" /></>
            ) : i === beats.length - 1 ? (
              <>See it run ▶</>
            ) : (
              <>Next line <ArrowIcon className="h-4 w-4" /></>
            )}
          </button>
        </div>
        {onOutro && (
          <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-steel/30 bg-steel/10 px-3 py-1 text-xs font-semibold text-steel">
            <CheckIcon className="h-3.5 w-3.5" /> Concept unlocked: {lesson.concept}
          </div>
        )}
      </div>
    </div>
  );
}
