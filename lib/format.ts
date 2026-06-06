import type { CodeBeat, ImageAttachment } from "./types";

let counter = 0;
/** Small unique id for messages (stable within a session). */
export function uid(prefix = "m"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/** Concatenate beats (in order) into the full source file. */
export function assembleBeats(beats: CodeBeat[]): string {
  return beats.map((b) => b.code).join("");
}

/** Assemble only the beats up to and including `index` — the file "so far". */
export function assembleBeatsUpTo(beats: CodeBeat[], index: number): string {
  return beats
    .slice(0, index + 1)
    .map((b) => b.code)
    .join("");
}

/** A reassembled beat lesson is usable only if it forms a real HTML document. */
export function beatsFormValidDoc(beats: CodeBeat[]): boolean {
  const full = assembleBeats(beats).trim();
  return (
    full.length > 0 &&
    /<!DOCTYPE html/i.test(full.slice(0, 200)) &&
    /<\/html>\s*$/i.test(full) &&
    full.includes("<body")
  );
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB — matches Anthropic's recommended limit

/** Read an uploaded image file into a base64 attachment (prefix stripped). */
export function fileToAttachment(file: File): Promise<ImageAttachment> {
  if (file.size > MAX_IMAGE_BYTES) {
    return Promise.reject(new Error(`Image "${file.name}" exceeds the 5 MB limit.`));
  }
  const mediaType = ALLOWED_IMAGE_TYPES.has(file.type) ? file.type : "image/png";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve({
        mediaType,
        data: comma >= 0 ? result.slice(comma + 1) : result,
        name: file.name,
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* falls through */
  }
  return false;
}

/** Strip any stray markdown code fences the model may have wrapped the HTML in. */
export function cleanGeneratedHtml(text: string): string {
  let t = (text ?? "").trim();
  t = t.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "");
  return t.trim();
}

/**
 * Apply find-and-replace edits to the current app, in order, each on the first
 * exact match. Returns the new code and how many edits actually landed (0 means
 * the caller should fall back to a full rebuild).
 */
export function applyEdits(
  code: string,
  edits: { find: string; replace: string }[],
): { code: string; applied: number } {
  let out = code;
  let applied = 0;
  for (const e of edits) {
    if (!e || typeof e.find !== "string" || typeof e.replace !== "string" || e.find.length === 0) {
      continue;
    }
    const idx = out.indexOf(e.find);
    if (idx === -1) continue;
    out = out.slice(0, idx) + e.replace + out.slice(idx + e.find.length);
    applied += 1;
  }
  return { code: out, applied };
}

/** Trigger a client-side download of text content (e.g. the built HTML). */
export function downloadText(filename: string, text: string, type = "text/html"): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
