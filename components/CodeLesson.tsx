"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BuildLesson, CodeBeat } from "@/lib/types";
import { assembleBeats, assembleBeatsUpTo } from "@/lib/format";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { ArrowIcon, CheckIcon, SoundIcon, MuteIcon, SparkIcon } from "./icons";

const LANG_BADGE: Record<CodeBeat["lang"], { label: string; cls: string }> = {
  html: { label: "HTML", cls: "border-ember/40 bg-ember/10 text-ember" },
  css: { label: "CSS", cls: "border-steel/40 bg-steel/10 text-steel" },
  js: { label: "JS", cls: "border-amber/40 bg-amber/10 text-amber" },
};

/** Very small, dependency-free syntax tint for tags / strings / keywords. */
function tint(code: string): string {
  let h = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  h = h.replace(/(&quot;|&#39;|"|')(.*?)\1/g, '<span class="tk-str">$1$2$1</span>');
  h = h.replace(
    /\b(const|let|var|function|return|for|forEach|if|else|new|document|localStorage|addEventListener)\b/g,
    '<span class="tk-kw">$1</span>',
  );
  h = h.replace(/(&lt;\/?)([a-zA-Z0-9]+)/g, '$1<span class="tk-tag">$2</span>');
  return h;
}

/** Type a string out, fast — returns the progressively revealed text. */
function useTypewriter(text: string, on: boolean, cps = 55) {
  const [out, setOut] = useState(on ? "" : text);
  useEffect(() => {
    if (!on) {
      setOut(text);
      return;
    }
    setOut("");
    let i = 0;
    const step = Math.max(1, Math.round(text.length / Math.max(1, (text.length / cps) * 60)));
    const id = setInterval(() => {
      i += step;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [text, on, cps]);
  return out;
}

interface CodeLessonProps {
  lesson: BuildLesson;
  partNumber: number;
  totalParts: number;
  voiceOn: boolean;
  onToggleVoice: () => void;
  onComplete: (finalCode: string) => void;
}

/**
 * The learning session DURING the build: real code arrives in teachable
 * "beats", each highlighted and narrated. The kid advances at their own pace;
 * the live preview grows beat-by-beat as the code is written.
 */
export function CodeLesson({
  lesson,
  partNumber,
  totalParts,
  voiceOn,
  onToggleVoice,
  onComplete,
}: CodeLessonProps) {
  const beats = lesson.beats;
  // -1 = intro screen; 0..n-1 = beats; n = done (outro)
  const [i, setI] = useState(-1);
  const [typed, setTyped] = useState(false); // user tapped "skip typing"
  const codeScrollRef = useRef<HTMLDivElement>(null);
  const beatRef = useRef<HTMLDivElement>(null);
  const { supported: ttsSupported, speak, cancel } = useSpeechSynthesis();

  const onIntro = i < 0;
  const onOutro = i >= beats.length;
  const current = !onIntro && !onOutro ? beats[i] : null;

  const fullCode = useMemo(() => assembleBeats(beats), [beats]);
  // Preview reflects the code revealed so far (valid-ish as it grows; final is exact).
  const codeSoFar = onOutro ? fullCode : i < 0 ? "" : assembleBeatsUpTo(beats, i);

  const narration = current?.say ?? (onIntro ? lesson.intro : lesson.outro);
  const shownNarration = useTypewriter(narration, !typed, 60);

  // Speak narration when voice is on and the beat changes.
  useEffect(() => {
    if (voiceOn && narration) speak(narration);
    else cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, voiceOn]);

  // Keep the newest code in view.
  useEffect(() => {
    codeScrollRef.current?.scrollTo({ top: codeScrollRef.current.scrollHeight, behavior: "smooth" });
    beatRef.current?.scrollIntoView({ block: "nearest" });
    setTyped(false);
  }, [i]);

  const next = () => {
    cancel();
    if (i >= beats.length) {
      onComplete(fullCode);
      return;
    }
    setI((v) => v + 1);
  };

  const newCount = beats.filter((b) => b.isNew).length;
  const newDoneCount = beats.slice(0, Math.max(0, i + 1)).filter((b) => b.isNew).length;
  const progress = onIntro ? 0 : onOutro ? 100 : Math.round(((i + 1) / beats.length) * 100);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* LEFT: the code, written beat by beat */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-[#0c0f15]">
        <div className="flex items-center justify-between border-b border-line/70 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
            <span className="ml-2 font-mono text-xs text-muted">app.html</span>
          </div>
          <span className="font-mono text-[11px] text-muted">
            {onOutro ? "complete" : onIntro ? "ready" : `beat ${i + 1}/${beats.length}`}
          </span>
        </div>

        <div ref={codeScrollRef} className="h-[54vh] overflow-auto p-4">
          {onIntro ? (
            <div className="grid h-full place-items-center text-center">
              <div className="animate-pop">
                <div className="mb-2 text-4xl">⌨️</div>
                <p className="font-mono text-sm text-muted">The code shows up here, one piece at a time…</p>
              </div>
            </div>
          ) : (
            <pre className="font-mono text-[12.5px] leading-relaxed">
              {beats.slice(0, i + 1).map((b, idx) => {
                const active = idx === i;
                return (
                  <div
                    key={idx}
                    ref={active ? beatRef : undefined}
                    className={[
                      "-mx-2 rounded-md px-2 py-0.5 transition-colors",
                      active ? "animate-rise bg-ember/10 ring-1 ring-ember/30" : b.isNew ? "" : "opacity-45",
                    ].join(" ")}
                  >
                    <code
                      className="tk"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: tint(b.code) }}
                    />
                  </div>
                );
              })}
            </pre>
          )}
        </div>

        {/* live preview strip */}
        <div className="border-t border-line/70">
          <div className="flex items-center justify-between px-4 py-1.5">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">live preview</span>
            <span className="font-mono text-[11px] text-good">▶ running</span>
          </div>
          <iframe
            title="Live preview"
            sandbox="allow-scripts"
            srcDoc={codeSoFar || "<!doctype html><body style='margin:0;background:#fff'></body>"}
            className="h-[22vh] w-full bg-white"
          />
        </div>
      </div>

      {/* RIGHT: Coach Spark teaching */}
      <div className="flex flex-col gap-4">
        {/* progress */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">
              Part {partNumber}/{totalParts} · {lesson.partTitle}
            </span>
            <span className="font-mono text-muted">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-panel2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber to-ember transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* coach card */}
        <div className="relative flex-1 rounded-2xl border border-ember/30 bg-gradient-to-b from-ember/10 to-panel/40 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-ember-soft to-ember-deep text-base shadow-glow">
                <SparkIcon className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-sm font-bold text-ink">Coach Spark</div>
                <div className="text-[11px] text-muted">
                  {onIntro ? "let's go!" : onOutro ? "you did it" : current?.isNew ? "writing new code" : "recap"}
                </div>
              </div>
            </div>
            {ttsSupported && (
              <button
                type="button"
                onClick={onToggleVoice}
                title={voiceOn ? "Voice on" : "Voice off"}
                className={[
                  "grid h-8 w-8 place-items-center rounded-lg border transition-colors",
                  voiceOn ? "border-ember/40 bg-ember/15 text-ember" : "border-line text-muted hover:text-ink",
                ].join(" ")}
              >
                {voiceOn ? <SoundIcon className="h-4 w-4" /> : <MuteIcon className="h-4 w-4" />}
              </button>
            )}
          </div>

          {current && (
            <div className="mb-2 flex items-center gap-2">
              <span className="font-display text-lg font-bold text-ink">{current.label}</span>
              <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${LANG_BADGE[current.lang].cls}`}>
                {LANG_BADGE[current.lang].label}
              </span>
              {current.isNew ? (
                <span className="rounded-full border border-good/40 bg-good/10 px-2 py-0.5 font-mono text-[10px] text-good">
                  new
                </span>
              ) : (
                <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-muted">
                  recap
                </span>
              )}
            </div>
          )}
          {onOutro && <div className="mb-2 text-3xl">🎉</div>}

          <p
            className="min-h-[7rem] text-[15px] leading-relaxed text-ink"
            onClick={() => setTyped(true)}
          >
            {shownNarration}
            {!typed && shownNarration.length < narration.length && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-ember align-middle" />
            )}
          </p>

          {onOutro && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-steel/30 bg-steel/10 px-3 py-1 text-xs font-semibold text-steel">
              <CheckIcon className="h-3.5 w-3.5" /> Concept unlocked: {lesson.concept}
            </div>
          )}

          {/* controls */}
          <div className="mt-5 flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted">
              {newDoneCount}/{newCount} new pieces explained
            </span>
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-2.5 font-display text-base font-bold text-base shadow-glow transition-transform hover:scale-[1.03]"
            >
              {onIntro ? (
                <>Start writing the code ⌨️</>
              ) : onOutro ? (
                <>
                  {partNumber >= totalParts ? "Finish my app" : "Next part"} <ArrowIcon className="h-4 w-4" />
                </>
              ) : i === beats.length - 1 ? (
                <>See it run ▶</>
              ) : (
                <>
                  Next line <ArrowIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
