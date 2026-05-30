"use client";

import { useState } from "react";
import type { ExportResult } from "@/lib/types";
import { copyToClipboard } from "@/lib/format";
import { ArrowIcon, CheckIcon, CopyIcon, SparkIcon } from "./icons";

export function ExportCard({
  refinedPrompt,
  result,
}: {
  refinedPrompt: string;
  result: ExportResult | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyToClipboard(refinedPrompt);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="animate-rise overflow-hidden rounded-2xl border border-ember/40 bg-gradient-to-b from-ember/10 to-panel/40 shadow-glow">
      <div className="flex items-center gap-2.5 border-b border-ember/20 px-5 py-3.5">
        <SparkIcon className="h-5 w-5 text-amber" />
        <div>
          <div className="font-display text-base font-bold text-ink">Sharp enough to ship</div>
          <div className="text-xs text-muted">
            Auto-exported to{" "}
            <span className="font-semibold text-ember">{result?.builderName ?? "your builder"}</span>
            {result?.webhook === "sent" && " · sent to your connected builder ✓"}
            {result?.webhook === "failed" && " · webhook failed, use the link below"}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Refined prompt
        </div>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-base/70 p-4 font-mono text-[13px] leading-relaxed text-ink">
          {refinedPrompt}
        </pre>

        <div className="flex flex-wrap gap-2.5">
          <a
            href={result?.builderUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!result}
            className={[
              "inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep px-4 py-2.5 text-sm font-semibold text-base shadow-glow transition-transform hover:scale-[1.02]",
              result ? "" : "pointer-events-none opacity-50",
            ].join(" ")}
          >
            Open in {result?.builderName ?? "builder"}
            <ArrowIcon className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel2 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ember/40"
          >
            {copied ? <CheckIcon className="h-4 w-4 text-good" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}
