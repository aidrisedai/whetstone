"use client";

import { useState } from "react";
import { copyToClipboard, downloadText } from "@/lib/format";
import { tint } from "@/lib/tint";
import { CheckIcon, CopyIcon } from "./icons";

/**
 * Full-file code viewer with line numbers, light syntax tint, and copy/download.
 * This is the "see the real code" surface — the platform's main artifact.
 */
export function CodeViewer({
  code,
  filename = "app.html",
  maxHeightClass = "max-h-[60vh]",
  title = "your code",
}: {
  code: string;
  filename?: string;
  maxHeightClass?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");

  async function copy() {
    const ok = await copyToClipboard(code);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1700);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-[#0c0f15]">
      <div className="flex items-center justify-between border-b border-line/70 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
          <span className="ml-2 font-mono text-xs text-muted">
            {filename} · {lines.length} lines
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:border-ember/40 hover:text-ink"
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5 text-good" /> : <CopyIcon className="h-3.5 w-3.5" />}
            {copied ? "copied" : "copy"}
          </button>
          <button
            type="button"
            onClick={() => downloadText(filename, code)}
            className="rounded-md border border-line px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:border-ember/40 hover:text-ink"
          >
            ↓ download
          </button>
        </div>
      </div>
      <div className={`overflow-auto ${maxHeightClass}`}>
        <table className="w-full border-collapse font-mono text-[12.5px] leading-relaxed">
          <tbody>
            {lines.map((ln, i) => (
              <tr key={i} className="align-top">
                <td className="select-none px-3 py-0 text-right text-muted/50" style={{ width: "1%" }}>
                  {i + 1}
                </td>
                <td className="whitespace-pre-wrap break-words px-2 py-0">
                  <code className="tk" dangerouslySetInnerHTML={{ __html: tint(ln) || "&nbsp;" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
