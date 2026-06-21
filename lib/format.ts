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

/** Read an uploaded image file into a base64 attachment (prefix stripped). */
export function fileToAttachment(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve({
        mediaType: file.type || "image/png",
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
