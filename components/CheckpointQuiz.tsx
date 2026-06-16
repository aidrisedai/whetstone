"use client";

import { useMemo, useRef, useState } from "react";
import type { Checkpoint } from "@/lib/types";
import { ArrowIcon, CheckIcon, CloseIcon, SparkIcon } from "./icons";

interface CheckpointQuizProps {
  checkpoint: Checkpoint;
  /** Called once when finished, with how many were correct (first-try). */
  onDone: (correct: number, total: number) => void;
}

/**
 * Interactive checkpoint: one question at a time, immediate feedback, kind
 * explanations, retry-friendly. First-try correctness drives bonus XP.
 */
export function CheckpointQuiz({ checkpoint, onDone }: CheckpointQuizProps) {
  const questions = checkpoint.questions;
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [firstTryRight, setFirstTryRight] = useState(0);
  const [attempted, setAttempted] = useState(false); // attempted current q before (no XP)
  const reportedRef = useRef(false);

  const q = questions[qi];
  const correct = picked !== null && picked === q.correctIndex;

  const optionLetters = useMemo(() => ["A", "B", "C", "D"], []);

  if (!q) {
    return null;
  }

  function choose(idx: number) {
    if (locked) return;
    setPicked(idx);
    setLocked(true);
    if (idx === q.correctIndex && !attempted) {
      setFirstTryRight((n) => n + 1);
    }
  }

  function tryAgain() {
    setAttempted(true);
    setPicked(null);
    setLocked(false);
  }

  function next() {
    if (qi < questions.length - 1) {
      setQi((v) => v + 1);
      setPicked(null);
      setLocked(false);
      setAttempted(false);
    } else if (!reportedRef.current) {
      reportedRef.current = true;
      onDone(firstTryRight, questions.length);
    }
  }

  return (
    <div className="animate-pop rounded-2xl border border-steel/30 bg-gradient-to-b from-steel/10 to-panel/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-steel to-good text-base">
            <SparkIcon className="h-4 w-4" />
          </span>
          <div>
            <div className="font-display text-sm font-bold text-ink">Checkpoint</div>
            <div className="text-[11px] text-muted">{checkpoint.partTitle}</div>
          </div>
        </div>
        <span className="font-mono text-[11px] text-muted">
          {qi + 1}/{questions.length}
        </span>
      </div>

      {qi === 0 && picked === null && !attempted && (
        <p className="mb-3 text-sm text-steel">{checkpoint.intro}</p>
      )}

      <p className="font-display text-lg font-bold leading-snug text-ink">{q.question}</p>

      {q.codeRef && (
        <pre className="mt-2 overflow-auto rounded-lg border border-line bg-[#0c0f15] p-3 font-mono text-[12px] leading-relaxed text-ink">
          {q.codeRef}
        </pre>
      )}

      <div className="mt-3 space-y-2">
        {q.options.map((opt, idx) => {
          const isCorrect = idx === q.correctIndex;
          const isPicked = idx === picked;
          let cls = "border-line bg-panel/50 hover:border-steel/40 text-ink";
          if (locked) {
            if (isCorrect) cls = "border-good/60 bg-good/10 text-ink";
            else if (isPicked) cls = "border-warn/60 bg-warn/10 text-ink";
            else cls = "border-line bg-panel/30 text-muted";
          }
          return (
            <button
              key={idx}
              type="button"
              disabled={locked}
              onClick={() => choose(idx)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[15px] transition-colors disabled:cursor-default ${cls}`}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-current/30 font-mono text-xs">
                {locked && isCorrect ? (
                  <CheckIcon className="h-4 w-4 text-good" />
                ) : locked && isPicked ? (
                  <CloseIcon className="h-4 w-4 text-warn" />
                ) : (
                  optionLetters[idx]
                )}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {locked && (
        <div
          className={`mt-3 rounded-xl border p-3 text-sm ${
            correct ? "border-good/40 bg-good/5 text-ink" : "border-amber/40 bg-amber/5 text-ink"
          }`}
        >
          <div className="mb-0.5 font-semibold">
            {correct ? "Nailed it! ✅" : "Not quite — but now you've got it 💡"}
          </div>
          <p className="text-muted">{correct ? q.explainCorrect : q.explainWrong}</p>
          {!correct && <p className="mt-1 text-ink">{q.explainCorrect}</p>}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted">
          {firstTryRight} right{attempted && !correct ? " · retrying" : ""}
        </span>
        {locked &&
          (correct ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-5 py-2.5 font-display text-base font-bold text-base shadow-glow transition-transform hover:scale-[1.03]"
            >
              {qi < questions.length - 1 ? "Next question" : "Finish checkpoint"}
              <ArrowIcon className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={tryAgain}
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-steel/40"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={next}
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
              >
                {qi < questions.length - 1 ? "Skip" : "Finish"}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
