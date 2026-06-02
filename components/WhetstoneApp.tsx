"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Assessment, ChatMessage, CriterionSpec, ExportResult, ImageAttachment, Lesson } from "@/lib/types";
import { fetchLesson, fetchScore, requestExport, streamAdvisor } from "@/lib/clientApi";
import { copyToClipboard, uid } from "@/lib/format";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { Composer } from "./Composer";
import { Conversation } from "./Conversation";
import { ExportCard } from "./ExportCard";
import { IdeaIntake } from "./IdeaIntake";
import { LessonCard } from "./LessonCard";
import { ScorePanel } from "./ScorePanel";
import { BuildWorkspace } from "./BuildWorkspace";
import { MuteIcon, SoundIcon, SparkIcon } from "./icons";

export function WhetstoneApp({
  demo,
  threshold,
  builderName,
}: {
  demo: boolean;
  threshold: number;
  builderName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exported, setExported] = useState(false);
  const [advisorTyping, setAdvisorTyping] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"sharpen" | "build">("sharpen");

  const { supported: ttsSupported, speak, cancel: cancelSpeech } = useSpeechSynthesis();

  const messagesRef = useRef<ChatMessage[]>([]);
  const criteriaRef = useRef<CriterionSpec[] | null>(null);
  const exportedRef = useRef(false);
  const voiceRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    voiceRef.current = voiceOut;
    if (!voiceOut) cancelSpeech();
  }, [voiceOut, cancelSpeech]);

  const updateMsg = useCallback((id: string, content: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)));
  }, []);

  const runAdvisor = useCallback(
    async (history: ChatMessage[], closing: boolean, msgId: string) => {
      let acc = "";
      try {
        await streamAdvisor(history, closing, (chunk) => {
          acc += chunk;
          updateMsg(msgId, acc);
        });
      } catch (err) {
        acc = acc || "⚠️ The advisor stumbled mid-thought. Try sending that again.";
        updateMsg(msgId, acc);
        setError(err instanceof Error ? err.message : "Advisor failed");
      } finally {
        setAdvisorTyping(false);
      }
      if (voiceRef.current && acc && !acc.startsWith("⚠️")) speak(acc);
    },
    [speak, updateMsg],
  );

  const runScore = useCallback(async (history: ChatMessage[]): Promise<Assessment | null> => {
    try {
      const a = await fetchScore(history, criteriaRef.current);
      setAssessment(a);
      if (!criteriaRef.current && a.dynamicCriteria.length > 0) {
        criteriaRef.current = a.dynamicCriteria.map((d) => ({
          key: d.key,
          label: d.label,
          bestPractice: d.bestPractice,
        }));
      }
      return a;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scoring failed");
      return null;
    } finally {
      setScoring(false);
    }
  }, []);

  const triggerExport = useCallback(
    async (history: ChatMessage[], result: Assessment) => {
      exportedRef.current = true;
      setExported(true);
      setLessonLoading(true);

      void requestExport(result.refinedPrompt).then(setExportResult).catch(() => {});
      void copyToClipboard(result.refinedPrompt).catch(() => {});

      const closeMsg: ChatMessage = { id: uid("a"), role: "advisor", content: "" };
      setMessages((prev) => [...prev, closeMsg]);
      setAdvisorTyping(true);
      await runAdvisor(history, true, closeMsg.id);

      try {
        setLesson(await fetchLesson(history));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lesson failed");
      } finally {
        setLessonLoading(false);
      }
    },
    [runAdvisor],
  );

  const handleSubmit = useCallback(
    async (content: string, images: ImageAttachment[]) => {
      if (busy) return;
      setError(null);

      const userMsg: ChatMessage = {
        id: uid("u"),
        role: "user",
        content,
        images: images.length ? images : undefined,
      };
      const advisorMsg: ChatMessage = { id: uid("a"), role: "advisor", content: "" };
      const nextHistory = [...messagesRef.current, userMsg];

      setMessages([...messagesRef.current, userMsg, advisorMsg]);
      setAdvisorTyping(true);
      setScoring(true);
      setBusy(true);

      try {
        const [, result] = await Promise.all([
          runAdvisor(nextHistory, false, advisorMsg.id),
          runScore(nextHistory),
        ]);

        if (result && result.ready && !exportedRef.current) {
          await triggerExport(nextHistory, result);
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, runAdvisor, runScore, triggerExport],
  );

  const reset = useCallback(() => {
    cancelSpeech();
    setMode("sharpen");
    setMessages([]);
    setAssessment(null);
    setLesson(null);
    setLessonLoading(false);
    setExportResult(null);
    setExported(false);
    setError(null);
    setBusy(false);
    criteriaRef.current = null;
    exportedRef.current = false;
  }, [cancelSpeech]);

  const started = messages.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-base/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <button type="button" onClick={reset} className="flex items-center gap-2.5 text-left">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-ember-soft to-ember-deep text-base shadow-glow">
              <SparkIcon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-display text-lg font-bold leading-none text-ink">
                Whetstone
              </span>
              <span className="block text-[11px] text-muted">sharpen the idea</span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            {demo && (
              <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-amber">
                demo
              </span>
            )}
            {ttsSupported && (
              <button
                type="button"
                onClick={() => setVoiceOut((v) => !v)}
                title={voiceOut ? "Advisor voice on" : "Advisor voice off"}
                className={[
                  "grid h-9 w-9 place-items-center rounded-lg border transition-colors",
                  voiceOut
                    ? "border-ember/40 bg-ember/15 text-ember"
                    : "border-line text-muted hover:text-ink",
                ].join(" ")}
              >
                {voiceOut ? <SoundIcon className="h-5 w-5" /> : <MuteIcon className="h-5 w-5" />}
              </button>
            )}
            {started && (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-ember/40 hover:text-ink"
              >
                New idea
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {!started ? (
          <IdeaIntake onSubmit={handleSubmit} demo={demo} builderName={builderName} />
        ) : mode === "build" && assessment ? (
          <BuildWorkspace
            refinedPrompt={assessment.refinedPrompt}
            projectType={assessment.projectType}
            messages={messages}
            builderName={builderName}
            onBack={() => setMode("sharpen")}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="flex min-w-0 flex-col gap-5">
              {exported && assessment && (
                <ExportCard refinedPrompt={assessment.refinedPrompt} result={exportResult} />
              )}
              {exported && <LessonCard lesson={lesson} loading={lessonLoading} />}

              <div className="min-h-[40vh]">
                <Conversation messages={messages} advisorTyping={advisorTyping} />
              </div>

              {error && (
                <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-sm text-warn">
                  {error}
                </div>
              )}

              <div className="sticky bottom-4">
                <Composer onSend={handleSubmit} disabled={busy} variant="dialogue" />
              </div>
            </section>

            <div className="lg:sticky lg:top-20 lg:self-start">
              <ScorePanel
                assessment={assessment}
                scoring={scoring}
                threshold={threshold}
                onBuild={
                  assessment
                    ? () => {
                        cancelSpeech();
                        setMode("build");
                      }
                    : undefined
                }
              />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-line/60 py-5 text-center text-xs text-muted">
        Whetstone · pitch → pushback → sharpened prompt → {builderName}
      </footer>
    </div>
  );
}
