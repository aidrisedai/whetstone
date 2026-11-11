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

/** The image formats Claude's vision input accepts. */
export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
/**
 * Per-image size ceiling. Claude's 5 MB limit is measured on the base64 text
 * that is actually sent, which is a third larger than the file, so the file
 * itself has to stay under 3.75 MB.
 */
export const MAX_IMAGE_BYTES = Math.floor((5 * 1024 * 1024 * 3) / 4);
export const MAX_IMAGES_PER_MESSAGE = 4;

/**
 * Whether an image can be sent to the advisor. An unsupported one is rejected
 * by the API, and since the whole history is re-sent every turn, a single bad
 * attachment would fail every later turn of the session too.
 */
export function isSupportedImage(mediaType: string, bytes: number): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mediaType) && bytes > 0 && bytes <= MAX_IMAGE_BYTES;
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

/**
 * Sandbox for the generated-app preview. Scripts run, forms submit (without
 * `allow-forms` the browser drops the submit before the app's own handler ever
 * sees it) and alert/confirm work. `allow-same-origin` stays off, so the app
 * can never reach Whetstone's own page, cookies or storage.
 */
export const PREVIEW_SANDBOX = "allow-scripts allow-forms allow-modals";

// Without `allow-same-origin`, touching localStorage throws, and one unguarded
// read stops the whole app script. Give the preview an in-memory stand-in; the
// saved file uses the browser's real storage.
const STORAGE_SHIM =
  "<script>(function(){try{window.localStorage.getItem('')}catch(e){var mk=function(){var m={};return{" +
  "getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null}," +
  "setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}}," +
  "key:function(i){return Object.keys(m)[i]||null},get length(){return Object.keys(m).length}}};" +
  "try{Object.defineProperty(window,'localStorage',{value:mk(),configurable:true});" +
  "Object.defineProperty(window,'sessionStorage',{value:mk(),configurable:true})}catch(_){}}})();</" +
  "script>";

/** The document to load in a preview iframe: the app's code plus the storage stand-in. */
export function previewDoc(code: string): string {
  if (!code.trim()) return code;
  for (const anchor of [/<head[^>]*>/i, /<html[^>]*>/i, /<!DOCTYPE[^>]*>/i]) {
    const m = anchor.exec(code);
    if (m) {
      const at = m.index + m[0].length;
      return code.slice(0, at) + STORAGE_SHIM + code.slice(at);
    }
  }
  return STORAGE_SHIM + code;
}
