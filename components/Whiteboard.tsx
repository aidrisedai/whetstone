"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardItem, BoardLesson } from "@/lib/types";
import { sendBoardChat } from "@/lib/clientApi";
import { useTeacherVoice } from "@/hooks/useTeacherVoice";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Caption } from "./Caption";
import { ArrowIcon, BookIcon, KeyboardIcon, MicIcon, PauseIcon, PlayIcon, SendIcon, SparkIcon } from "./icons";

interface WhiteboardProps {
  board: BoardLesson;
  projectName: string;
  part: { title: string; concept: string };
  partNumber: number;
  totalParts: number;
  voiceOn: boolean;
  onToggleVoice: () => void;
  onReadyToCode: () => void;
}

type ChatMsg = { who: "teacher" | "student"; text: string };

const HL: Record<string, string> = {
  blue: "hl hl-blue",
  pink: "hl hl-pink",
  yellow: "hl hl-yellow",
  green: "hl hl-green",
};
const PEN: Record<string, string> = {
  teal: "text-[color:var(--pen-teal)]",
  red: "text-[color:var(--pen-red)]",
  amber: "text-[color:var(--pen-amber)]",
};

/** A single hand-drawn board item, styled to feel like marker on paper. */
function BoardItemView({ item }: { item: BoardItem }) {
  const hl = item.color && HL[item.color] ? HL[item.color] : "";
  const pen = item.color && PEN[item.color] ? PEN[item.color] : "";

  switch (item.kind) {
    case "title":
      return (
        <div className="ink-in marker mb-1 text-3xl font-bold text-[color:var(--ink)]">
          <span className={hl}>{item.text}</span>
        </div>
      );
    case "fact": {
      // "Term: definition" → bold term, normal definition (like the reference).
      const idx = item.text.indexOf(":");
      const term = idx > 0 ? item.text.slice(0, idx) : item.text;
      const def = idx > 0 ? item.text.slice(idx + 1).trim() : "";
      return (
        <div className="ink-in hand text-[19px] leading-snug">
          <span className={`font-bold ${pen}`}>{term}{def ? ":" : ""}</span>
          {def && <span className="text-[color:var(--ink-soft)]"> {def}</span>}
        </div>
      );
    }
    case "equation":
      return (
        <div className="ink-in hand text-[20px] leading-relaxed text-[color:var(--ink)]">
          <span className={hl}>{item.text}</span>
        </div>
      );
    case "callout":
      return (
        <div className="ink-in marker my-1 inline-block -rotate-1 rounded-2xl border-[2.5px] border-[color:var(--pen-amber)] bg-[var(--hl-yellow)]/40 px-4 py-1.5 text-2xl font-bold text-[color:var(--ink)]">
          {item.text}
        </div>
      );
    case "box":
      return (
        <div
          className={`ink-in hand inline-block rounded-xl border-[2.5px] px-3 py-2 text-center text-[17px] font-bold text-[color:var(--ink)] ${
            item.color === "pink"
              ? "border-[color:var(--pen-red)] bg-[var(--hl-pink)]/50"
              : item.color === "green"
                ? "border-[color:#6cbf73] bg-[var(--hl-green)]/50"
                : "border-[color:var(--pen-teal)] bg-[var(--hl-blue)]/40"
          }`}
        >
          {item.text}
        </div>
      );
    case "arrow": {
      const [a, b] = item.text.split(/->|→/).map((s) => s.trim());
      return (
        <div className="ink-in hand flex flex-wrap items-center gap-2 text-[17px] text-[color:var(--ink)]">
          {b !== undefined ? (
            <>
              <span className="rounded-lg bg-white/60 px-2 py-1 ring-1 ring-black/5">{a}</span>
              <ArrowIcon className="h-5 w-5 text-[color:var(--pen-red)]" />
              <span className="rounded-lg bg-white/60 px-2 py-1 ring-1 ring-black/5">{b}</span>
            </>
          ) : (
            <span>{item.text}</span>
          )}
        </div>
      );
    }
    case "code":
      return (
        <code className="ink-in block rounded-lg bg-[#0e1622] px-3 py-1.5 font-mono text-[13px] text-[#9be7b0]">
          {item.text}
        </code>
      );
    case "note":
      return (
        <div className="ink-in hand text-[16px] italic text-[color:var(--ink-soft)]">
          <span aria-hidden>✎ </span>
          {item.text}
        </div>
      );
    case "bullet":
    default:
      return (
        <div className={`ink-in hand flex items-start gap-2 text-[18px] text-[color:var(--ink)] ${item.emphasis ? "font-bold" : ""}`}>
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--pen-teal)" }} />
          <span className={hl}>{item.text}</span>
        </div>
      );
  }
}

export function Whiteboard({
  board,
  projectName,
  part,
  partNumber,
  totalParts,
  voiceOn,
  onToggleVoice,
  onReadyToCode,
}: WhiteboardProps) {
  const [revealed, setRevealed] = useState(0);
  const [extraItems, setExtraItems] = useState<BoardItem[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [showType, setShowType] = useState(false); // keyboard input revealed
  const [caption, setCaption] = useState(""); // current spoken line for the caption bar
  const [paused, setPaused] = useState(false);

  const teacher = useTeacherVoice();
  const mic = useSpeechRecognition();
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef(voiceOn);
  useEffect(() => {
    voiceRef.current = voiceOn;
    if (!voiceOn) teacher.stop();
  }, [voiceOn, teacher]);

  const lastStep = revealed > 0 ? board.steps[revealed - 1] : null;
  const pendingAsk = lastStep?.ask;

  const say = useCallback(
    (text: string) => {
      setCaption(text);
      setPaused(false);
      if (voiceRef.current) teacher.speak(text);
    },
    [teacher],
  );

  const revealNext = useCallback(() => {
    setRevealed((r) => {
      if (r >= board.steps.length) return r;
      const step = board.steps[r];
      setChat((c) => [...c, { who: "teacher", text: step.say }]);
      say(step.say);
      return r + 1;
    });
  }, [board.steps, say]);

  useEffect(() => {
    setChat([{ who: "teacher", text: `Welcome to the board! Let's plan ${part.title} together.` }]);
  }, []); // intentional: run only on mount

  const beginLesson = useCallback(() => {
    teacher.prime();
    setStarted(true);
    revealNext();
  }, [teacher, revealNext]);

  useEffect(() => {
    boardScrollRef.current?.scrollTo({ top: boardScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [revealed, extraItems]);

  useEffect(() => {
    if (mic.listening) setInput(mic.transcript);
  }, [mic.transcript, mic.listening]);

  const moreSteps = revealed < board.steps.length;

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;
    if (mic.listening) mic.stop();
    setInput("");
    mic.reset();
    setChat((c) => [...c, { who: "student", text }]);
    setThinking(true);
    try {
      const boardSoFar = [
        board.boardTitle,
        ...board.steps.slice(0, revealed).flatMap((s) => s.items.map((i) => `${i.kind}: ${i.text}`)),
        ...extraItems.map((i) => `${i.kind}: ${i.text}`),
      ].join("\n");
      const res = await sendBoardChat({ projectName, part, boardSoFar, studentSaid: text, lastAsk: pendingAsk });
      setChat((c) => [...c, { who: "teacher", text: res.reply }]);
      if (res.boardItem) setExtraItems((it) => [...it, res.boardItem as BoardItem]);
      say(res.reply);
    } catch {
      const oops = "Oops, I lost my train of thought — say that again?";
      setChat((c) => [...c, { who: "teacher", text: oops }]);
      say(oops);
    } finally {
      setThinking(false);
    }
  }

  function togglePause() {
    if (paused) {
      teacher.resume();
      setPaused(false);
    } else {
      teacher.pause();
      setPaused(true);
    }
  }

  function finish() {
    setDone(true);
    say(board.closing);
  }

  const transcript = chat.slice(-3); // recent lines for the side rail

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      {/* THE WHITEBOARD — warm hand-drawn paper, like the reference */}
      <div className="relative flex flex-col overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/5">
        <div ref={boardScrollRef} className="paper relative h-[62vh] overflow-auto px-7 py-6">
          {/* little "open book" affordance like the reference, top-right */}
          <button
            type="button"
            onClick={() => setShowType((v) => !v)}
            title="Notes"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/70 text-[color:var(--ink-soft)] shadow ring-1 ring-black/5 hover:text-[color:var(--ink)]"
          >
            <BookIcon className="h-4 w-4" />
          </button>

          {!started ? (
            <div className="grid h-full place-items-center text-center">
              <div className="animate-pop">
                <div className="mb-2 text-5xl">🖍️</div>
                <h3 className="marker text-3xl font-bold text-[color:var(--ink)]">{board.boardTitle}</h3>
                <p className="hand mx-auto mt-1 max-w-xs text-lg text-[color:var(--ink-soft)]">
                  Coach Spark will walk you through it — out loud.
                </p>
                <button
                  type="button"
                  onClick={beginLesson}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-ember-soft to-ember-deep px-6 py-3 font-display text-lg font-bold text-white shadow-glow transition-transform hover:scale-[1.03]"
                >
                  <PlayIcon className="h-5 w-5" /> Start lesson
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="marker mb-4 text-center text-2xl font-bold text-[color:var(--ink-soft)]">
                {board.boardTitle}
              </div>
              {/* True masonry: all revealed items flow left-to-right across columns,
                  filling the board like a real teacher's sketch (the reference). */}
              <div className="board-columns">
                {board.steps
                  .slice(0, revealed)
                  .flatMap((step, si) => step.items.map((item, ii) => ({ item, key: `${si}-${ii}` })))
                  .map(({ item, key }) => (
                    <div key={key} className="board-cell">
                      <BoardItemView item={item} />
                    </div>
                  ))}
                {extraItems.map((item, i) => (
                  <div key={`x-${i}`} className="board-cell">
                    <BoardItemView item={item} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ─── Bottom control bar (avatar · caption · mic) like the reference ─── */}
        {started && (
          <div className="flex items-center gap-3 border-t border-black/5 bg-white/80 px-4 py-3 backdrop-blur">
            {/* teacher avatar + pause */}
            <div className="flex items-center gap-2">
              <div
                className={`relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-ember-soft to-ember-deep text-white shadow-glow ${
                  teacher.speaking ? "ring-4 ring-ember/30" : ""
                }`}
              >
                <SparkIcon className="h-6 w-6" />
                {teacher.speaking && <span className="absolute inset-0 animate-ping rounded-full bg-ember/20" />}
              </div>
              <button
                type="button"
                onClick={togglePause}
                title={paused ? "Resume" : "Pause"}
                className="grid h-9 w-9 place-items-center rounded-full bg-panel2/10 text-[color:var(--ink-soft)] ring-1 ring-black/10 hover:text-[color:var(--ink)]"
              >
                {paused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
              </button>
            </div>

            {/* live caption (karaoke) */}
            <div className="min-w-0 flex-1">
              {caption ? (
                <Caption text={caption} progress={teacher.progress} />
              ) : (
                <p className="text-center text-sm text-[color:var(--ink-soft)]">…</p>
              )}
            </div>

            {/* input affordances */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowType((v) => !v)}
                title="Type to your teacher"
                className={`grid h-10 w-10 place-items-center rounded-full ring-1 ring-black/10 transition-colors ${
                  showType ? "bg-ember/15 text-ember" : "bg-white text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]"
                }`}
              >
                <KeyboardIcon className="h-5 w-5" />
              </button>
              {mic.supported && (
                <button
                  type="button"
                  onClick={() => {
                    setShowType(true);
                    if (mic.listening) { mic.stop(); } else { mic.start(input); }
                  }}
                  title={mic.listening ? "Stop" : "Talk to your teacher"}
                  className={`relative grid h-11 w-11 place-items-center rounded-full shadow transition-colors ${
                    mic.listening ? "bg-ember text-white" : "bg-white text-[color:var(--ink)] ring-1 ring-black/10"
                  }`}
                >
                  <MicIcon className="h-5 w-5" />
                  {mic.listening && <span className="absolute inset-0 animate-ping rounded-full bg-ember/40" />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── SIDE RAIL: progress, chat, and ask-back input ─── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">{board.boardTitle}</h2>
            <p className="text-xs text-muted">
              Part {partNumber}/{totalParts} · planning on the board
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {teacher.hdAvailable === true && (
              <span className="rounded-full border border-good/40 bg-good/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-good">
                HD
              </span>
            )}
            <button
              type="button"
              onClick={onToggleVoice}
              title={voiceOn ? "Mute teacher" : "Unmute teacher"}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                voiceOn ? "border-ember/40 bg-ember/15 text-ember" : "border-line text-muted hover:text-ink"
              }`}
            >
              {voiceOn ? "🔊 Voice on" : "🔇 Muted"}
            </button>
          </div>
        </div>

        {/* progress dots */}
        <div className="flex items-center gap-1.5">
          {board.steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < revealed ? "bg-gradient-to-r from-amber to-ember" : "bg-panel2"
              }`}
            />
          ))}
        </div>

        {/* recent conversation */}
        <div className="flex-1 space-y-2 overflow-auto rounded-2xl border border-line bg-panel/40 p-3" style={{ maxHeight: "34vh" }}>
          {transcript.map((m, i) => (
            <div key={i} className={`flex ${m.who === "student" ? "justify-end" : "justify-start"}`}>
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
          {pendingAsk && !thinking && (
            <div className="rounded-xl border border-amber/30 bg-amber/5 px-3 py-2 text-xs text-amber">🤔 {pendingAsk}</div>
          )}
        </div>

        {/* type-back box (revealed by the keyboard/mic buttons) */}
        {(showType || input) && (
          <div className="rounded-2xl border border-line bg-panel/80 p-2">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                autoFocus
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder={mic.listening ? "Listening… talk now" : "Ask a question or answer…"}
                className="min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={thinking || !input.trim()}
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep text-white shadow-glow transition-transform hover:scale-105 disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none disabled:hover:scale-100"
                aria-label="Send"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* advance / finish */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-muted">{revealed}/{board.steps.length} sketched</span>
          {!started ? (
            <span className="text-xs text-muted">press Start on the board</span>
          ) : moreSteps ? (
            <button
              type="button"
              onClick={revealNext}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-steel to-good px-4 py-2 text-sm font-bold text-base shadow-glow transition-transform hover:scale-[1.03]"
            >
              Next on the board <ArrowIcon className="h-4 w-4" />
            </button>
          ) : !done ? (
            <button
              type="button"
              onClick={finish}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-4 py-2 font-display text-sm font-bold text-white shadow-glow transition-transform hover:scale-[1.03]"
            >
              I get it — let&apos;s code it!
            </button>
          ) : (
            <button
              type="button"
              onClick={onReadyToCode}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-2 font-display text-sm font-bold text-white shadow-glow transition-transform hover:scale-[1.03]"
            >
              Start writing the code <ArrowIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
