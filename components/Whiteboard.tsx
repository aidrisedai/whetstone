"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardItem, BoardLesson } from "@/lib/types";
import { sendBoardChat } from "@/lib/clientApi";
import { useTeacherVoice } from "@/hooks/useTeacherVoice";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { ArrowIcon, MicIcon, MuteIcon, SendIcon, SoundIcon, SparkIcon } from "./icons";

interface WhiteboardProps {
  board: BoardLesson;
  projectName: string;
  part: { title: string; concept: string };
  partNumber: number;
  totalParts: number;
  voiceOn: boolean;
  onToggleVoice: () => void;
  /** Called when the student is ready to move from teaching → writing code. */
  onReadyToCode: () => void;
}

type ChatMsg = { who: "teacher" | "student"; text: string };

/** A single thing rendered on the board, styled by kind. */
function BoardItemView({ item }: { item: BoardItem }) {
  const base = "ink-in";
  switch (item.kind) {
    case "title":
      return (
        <div className={`${base} mb-1 font-display text-2xl font-bold text-ink`}>{item.text}</div>
      );
    case "callout":
      return (
        <div
          className={`${base} my-1 inline-flex items-center gap-2 rounded-xl border-2 border-amber/60 bg-amber/10 px-4 py-2 font-display text-lg font-bold text-amber`}
        >
          💡 {item.text}
        </div>
      );
    case "box":
      return (
        <div
          className={`${base} inline-block rounded-lg border-2 border-steel/60 bg-steel/10 px-3 py-2 text-center text-sm font-semibold text-ink ${
            item.emphasis ? "ring-2 ring-steel/40" : ""
          }`}
        >
          {item.text}
        </div>
      );
    case "arrow": {
      const [a, b] = item.text.split(/->|→/).map((s) => s.trim());
      return (
        <div className={`${base} flex flex-wrap items-center gap-2 text-sm font-medium text-ink`}>
          {b !== undefined ? (
            <>
              <span className="rounded-md bg-panel2 px-2 py-1">{a}</span>
              <ArrowIcon className="h-4 w-4 text-ember" />
              <span className="rounded-md bg-panel2 px-2 py-1">{b}</span>
            </>
          ) : (
            <span>{item.text}</span>
          )}
        </div>
      );
    }
    case "code":
      return (
        <code className={`${base} block rounded-md border border-line bg-[#0c0f15] px-3 py-1.5 font-mono text-[13px] text-good`}>
          {item.text}
        </code>
      );
    case "note":
      return (
        <div className={`${base} text-sm italic text-muted`}>
          <span aria-hidden>✎ </span>
          {item.text}
        </div>
      );
    case "bullet":
    default:
      return (
        <div className={`${base} flex items-start gap-2 text-[15px] text-ink ${item.emphasis ? "font-semibold" : ""}`}>
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
          <span>{item.text}</span>
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
  // How many steps are revealed (0 = nothing yet; board.steps.length = all shown).
  const [revealed, setRevealed] = useState(0);
  const [extraItems, setExtraItems] = useState<BoardItem[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [done, setDone] = useState(false);

  const teacher = useTeacherVoice();
  const mic = useSpeechRecognition();
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef(voiceOn);
  useEffect(() => {
    voiceRef.current = voiceOn;
    if (!voiceOn) teacher.stop();
  }, [voiceOn, teacher]);

  const lastStep = revealed > 0 ? board.steps[revealed - 1] : null;
  const pendingAsk = lastStep?.ask;

  // Reveal the next step: add its items to the board, push its speech, speak it.
  const revealNext = useCallback(() => {
    setRevealed((r) => {
      if (r >= board.steps.length) return r;
      const step = board.steps[r];
      setChat((c) => [...c, { who: "teacher", text: step.say }]);
      if (voiceRef.current) teacher.speak(step.say);
      return r + 1;
    });
  }, [board.steps, teacher]);

  // Kick off the first step on mount.
  useEffect(() => {
    setChat([{ who: "teacher", text: `Welcome to the board! Let's plan ${part.title} together. ✏️` }]);
    const id = setTimeout(revealNext, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    boardScrollRef.current?.scrollTo({ top: boardScrollRef.current.scrollHeight, behavior: "smooth" });
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [revealed, extraItems, chat, thinking]);

  // Mirror live mic transcript into the input box.
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
      const res = await sendBoardChat({
        projectName,
        part,
        boardSoFar,
        studentSaid: text,
        lastAsk: pendingAsk,
      });
      setChat((c) => [...c, { who: "teacher", text: res.reply }]);
      if (res.boardItem) setExtraItems((it) => [...it, res.boardItem as BoardItem]);
      if (voiceRef.current) teacher.speak(res.reply);
    } catch {
      setChat((c) => [...c, { who: "teacher", text: "Oops, I lost my train of thought — say that again?" }]);
    } finally {
      setThinking(false);
    }
  }

  function finish() {
    teacher.stop();
    if (voiceRef.current) teacher.speak(board.closing);
    setDone(true);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      {/* THE BOARD */}
      <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-steel/30 bg-[#0e1622] shadow-glow">
        <div className="flex items-center justify-between border-b border-steel/20 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-steel/60" />
            <span className="font-display text-sm font-bold text-ink">Whiteboard</span>
          </div>
          <span className="font-mono text-[11px] text-muted">
            Part {partNumber}/{totalParts} · planning
          </span>
        </div>

        <div ref={boardScrollRef} className="board-grid h-[56vh] overflow-auto p-5">
          <div className="mb-4 border-b border-steel/20 pb-2 text-center font-display text-xl font-bold text-steel">
            {board.boardTitle}
          </div>
          <div className="space-y-3">
            {board.steps.slice(0, revealed).map((step, si) => (
              <div key={si} className="flex flex-wrap items-start gap-2.5">
                {step.items.map((item, ii) => (
                  <BoardItemView key={`${si}-${ii}`} item={item} />
                ))}
              </div>
            ))}
            {extraItems.length > 0 && (
              <div className="mt-2 flex flex-wrap items-start gap-2.5 border-t border-dashed border-steel/20 pt-3">
                {extraItems.map((item, i) => (
                  <BoardItemView key={`x-${i}`} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Board controls */}
        <div className="flex items-center justify-between gap-2 border-t border-steel/20 px-4 py-2.5">
          <span className="font-mono text-[11px] text-muted">
            {revealed}/{board.steps.length} sketched
          </span>
          {moreSteps ? (
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
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-4 py-2 font-display text-sm font-bold text-base shadow-glow transition-transform hover:scale-[1.03]"
            >
              I get it — let&apos;s code it! ⌨️
            </button>
          ) : (
            <button
              type="button"
              onClick={onReadyToCode}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-2 font-display text-sm font-bold text-base shadow-glow transition-transform hover:scale-[1.03]"
            >
              Start writing the code <ArrowIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* TEACHER + CHAT */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-2xl border border-ember/30 bg-gradient-to-b from-ember/10 to-panel/40 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep text-base shadow-glow ${
                teacher.speaking ? "animate-float" : ""
              }`}
            >
              <SparkIcon className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-sm font-bold text-ink">Coach Spark</span>
                {teacher.hdAvailable === true && (
                  <span className="rounded-full border border-good/40 bg-good/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-good">
                    HD voice
                  </span>
                )}
                {teacher.hdAvailable === false && (
                  <span
                    title="Set GOOGLE_TTS_API_KEY in .env.local for the natural HD voice"
                    className="rounded-full border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-amber"
                  >
                    basic voice
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted">{teacher.speaking ? "speaking…" : "your teacher"}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleVoice}
            title={voiceOn ? "Voice on" : "Voice off"}
            className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${
              voiceOn ? "border-ember/40 bg-ember/15 text-ember" : "border-line text-muted hover:text-ink"
            }`}
          >
            {voiceOn ? <SoundIcon className="h-5 w-5" /> : <MuteIcon className="h-5 w-5" />}
          </button>
        </div>

        {/* chat transcript */}
        <div className="flex-1 space-y-2.5 overflow-auto rounded-2xl border border-line bg-panel/40 p-3" style={{ maxHeight: "44vh" }}>
          {chat.map((m, i) => (
            <div key={i} className={`flex ${m.who === "student" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed ${
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
              <div className="rounded-2xl rounded-tl-sm border border-line bg-panel px-3.5 py-2">
                <span className="inline-flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-typing rounded-full bg-ember" style={{ animationDelay: `${d * 0.16}s` }} />
                  ))}
                </span>
              </div>
            </div>
          )}
          {pendingAsk && !thinking && (
            <div className="rounded-xl border border-amber/30 bg-amber/5 px-3 py-2 text-xs text-amber">
              🤔 {pendingAsk}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* student input: type or talk */}
        <div className="rounded-2xl border border-line bg-panel/80 p-2">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder={mic.listening ? "Listening… talk to your teacher" : "Ask a question or answer…"}
              className="min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none"
            />
            {mic.supported && (
              <button
                type="button"
                onClick={() => (mic.listening ? mic.stop() : mic.start(input))}
                title={mic.listening ? "Stop talking" : "Talk to your teacher"}
                className={`relative grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                  mic.listening ? "bg-ember text-base" : "text-muted hover:bg-panel2 hover:text-ink"
                }`}
              >
                <MicIcon className="h-5 w-5" />
                {mic.listening && <span className="absolute inset-0 animate-ping rounded-xl bg-ember/40" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => void send()}
              disabled={thinking || !input.trim()}
              className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep text-base shadow-glow transition-transform hover:scale-105 disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none disabled:hover:scale-100"
              aria-label="Send"
            >
              <SendIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
