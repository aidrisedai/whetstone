"use client";

import { useEffect, useRef, useState } from "react";
import type { ImageAttachment } from "@/lib/types";
import { fileToAttachment } from "@/lib/format";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { CloseIcon, ImageIcon, MicIcon, SendIcon } from "./icons";

interface ComposerProps {
  onSend: (content: string, images: ImageAttachment[]) => void;
  disabled?: boolean;
  variant?: "intake" | "dialogue";
  placeholder?: string;
  autoFocus?: boolean;
  initialValue?: string;
}

export function Composer({
  onSend,
  disabled = false,
  variant = "dialogue",
  placeholder,
  autoFocus = false,
  initialValue = "",
}: ComposerProps) {
  const [input, setInput] = useState(initialValue);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { supported: micSupported, listening, transcript, start, stop, reset } =
    useSpeechRecognition();

  // While the mic is live, mirror the running transcript into the text box.
  useEffect(() => {
    if (listening) setInput(transcript);
  }, [transcript, listening]);

  // Auto-grow the textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, variant === "intake" ? 220 : 160)}px`;
  }, [input, variant]);

  const intake = variant === "intake";

  async function addFiles(files: FileList | File[]) {
    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — Anthropic vision limit
    const accepted = Array.from(files).filter(
      (f) => f.type.startsWith("image/") && f.size <= MAX_BYTES,
    );
    const next = await Promise.all(accepted.map(fileToAttachment));
    if (next.length) setImages((prev) => [...prev, ...next].slice(0, 4));
  }

  function submit() {
    const content = input.trim();
    if (disabled || (!content && images.length === 0)) return;
    if (listening) stop();
    onSend(content, images);
    setInput("");
    setImages([]);
    reset();
  }

  function toggleMic() {
    if (listening) stop();
    else start(input);
  }

  return (
    <div
      className={[
        "group relative rounded-2xl border bg-panel/80 backdrop-blur transition-colors",
        dragOver ? "border-ember" : "border-line",
        intake ? "p-4 shadow-glow" : "p-2.5",
      ].join(" ")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
      }}
    >
      {images.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2 px-1">
          {images.map((img, i) => (
            <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${img.mediaType};base64,${img.data}`}
                alt={img.name ?? "attachment"}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-base/80 text-ink hover:bg-warn"
                aria-label="Remove image"
              >
                <CloseIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          autoFocus={autoFocus}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={
            placeholder ??
            (intake ? "Describe the thing you want to build…" : "Push back, refine, add detail…")
          }
          className={[
            "min-w-0 flex-1 resize-none bg-transparent text-ink placeholder:text-muted/70 focus:outline-none",
            intake ? "px-2 py-1.5 text-lg" : "px-2 py-2 text-[15px]",
          ].join(" ")}
        />

        <div className="flex items-center gap-1.5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            title="Attach an image (sketch, mockup, screenshot)"
            className="grid h-10 w-10 place-items-center rounded-xl text-muted transition-colors hover:bg-panel2 hover:text-ink disabled:opacity-40"
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          {micSupported && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={disabled}
              title={listening ? "Stop voice input" : "Speak your idea"}
              className={[
                "relative grid h-10 w-10 place-items-center rounded-xl transition-colors disabled:opacity-40",
                listening ? "bg-ember text-base" : "text-muted hover:bg-panel2 hover:text-ink",
              ].join(" ")}
            >
              <MicIcon className="h-5 w-5" />
              {listening && (
                <span className="absolute inset-0 animate-ping rounded-xl bg-ember/40" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={disabled || (!input.trim() && images.length === 0)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-ember-soft to-ember-deep text-base shadow-glow transition-transform hover:scale-105 disabled:from-line disabled:to-line disabled:text-muted disabled:shadow-none disabled:hover:scale-100"
            aria-label="Send"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {listening && (
        <div className="mt-1.5 px-2 text-xs font-medium text-ember">listening… speak now</div>
      )}
    </div>
  );
}
