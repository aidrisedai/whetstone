"use client";

import { useState } from "react";
import type { ImageAttachment } from "@/lib/types";
import { Composer } from "./Composer";

const EXAMPLES = [
  "An app that helps my robotics team track parts and orders",
  "A game where you learn chemistry by mixing potions",
  "An AI study buddy that quizzes me from my class notes",
];

export function IdeaIntake({
  onSubmit,
  demo,
  builderName,
}: {
  onSubmit: (content: string, images: ImageAttachment[]) => void;
  demo: boolean;
  builderName: string;
}) {
  const [seed, setSeed] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 py-10 text-center sm:py-16">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          voice · text · images
        </div>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Bring an idea.
          <br />
          Leave with an{" "}
          <span className="bg-gradient-to-r from-amber via-ember to-ember-deep bg-clip-text text-transparent">
            edge
          </span>
          .
        </h1>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted">
          Pitch what you want to build. A sharp CEO advisor pushes back — question by question — until
          your idea is clear, tight, and specific. Cross the bar and it ships itself to{" "}
          <span className="text-ink">{builderName}</span>.
        </p>
      </div>

      <div className="w-full text-left">
        <Composer
          key={seed || "blank"}
          initialValue={seed}
          onSend={onSubmit}
          variant="intake"
          autoFocus
          placeholder="Describe the thing you want to build…"
        />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setSeed(ex)}
              className="rounded-full border border-line bg-panel/50 px-3 py-1.5 text-xs text-muted transition-colors hover:border-ember/40 hover:text-ink"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {demo && (
        <p className="max-w-md text-xs leading-relaxed text-muted/80">
          Running in <span className="text-amber">demo mode</span> — set{" "}
          <code className="font-mono text-ink">ANTHROPIC_API_KEY</code> to wake the real Claude-powered
          advisor. The full flow works either way.
        </p>
      )}
    </div>
  );
}
