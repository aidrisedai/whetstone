import type { Assessment } from "@/lib/types";
import { DimensionBar } from "./DimensionBar";
import { ScoreRing } from "./ScoreRing";
import { ArrowIcon, SparkIcon } from "./icons";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{children}</div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-6 text-sm leading-relaxed text-muted">
      Your scoreboard lights up here. Every version of your idea is scored on{" "}
      <span className="text-ink">clarity</span> and <span className="text-ink">conciseness</span>,
      plus 2–3 criteria tuned to what you&apos;re building — all pulled from Claude prompt-engineering
      best practices.
    </div>
  );
}

export function ScorePanel({
  assessment,
  scoring,
  threshold,
  onBuild,
}: {
  assessment: Assessment | null;
  scoring: boolean;
  threshold: number;
  onBuild?: () => void;
}) {
  return (
    <aside className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Scoreboard</h2>
        <span
          className={[
            "flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest transition-opacity",
            scoring ? "text-ember opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember" />
          evaluating
        </span>
      </div>

      {!assessment ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-panel/60 p-5">
            <ScoreRing overall={assessment.overall} threshold={threshold} ready={assessment.ready} />
            <div className="flex flex-col items-center gap-1.5">
              <span className="rounded-full border border-steel/30 bg-steel/10 px-3 py-1 text-xs font-semibold text-steel">
                {assessment.projectType}
              </span>
              <p className="text-center text-xs text-muted">
                {assessment.ready ? (
                  <span className="text-good">Cleared the bar — exporting ✓</span>
                ) : assessment.overall < threshold ? (
                  <>
                    <span className="font-mono text-ink">{threshold - assessment.overall}</span> pts to
                    the threshold (<span className="font-mono">{threshold}</span>)
                  </>
                ) : (
                  <>Lift every dimension above the floor to clear the bar</>
                )}
              </p>
            </div>
          </div>

          {onBuild && (
            <button
              type="button"
              onClick={onBuild}
              className={[
                "group flex w-full items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left transition-colors",
                assessment.ready
                  ? "border-ember/50 bg-gradient-to-br from-ember/15 to-panel/40 shadow-glow"
                  : "border-line bg-panel/60 hover:border-ember/40",
              ].join(" ")}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-display text-base font-bold text-ink">
                  <SparkIcon className="h-4 w-4 text-ember" />
                  Build it{assessment.ready ? "" : " now"}
                </span>
                <span className="block text-xs text-muted">
                  {assessment.ready
                    ? "It's sharp — bring it to life."
                    : "Sharpen more, or jump in and build."}
                </span>
              </span>
              <ArrowIcon className="h-5 w-5 shrink-0 text-ember transition-transform group-hover:translate-x-0.5" />
            </button>
          )}

          <section>
            <SectionLabel>Fixed · every prompt</SectionLabel>
            <div className="space-y-4">
              <DimensionBar
                label="Clarity"
                score={assessment.clarity.score}
                rationale={assessment.clarity.rationale}
                suggestion={assessment.clarity.suggestion}
              />
              <DimensionBar
                label="Conciseness"
                score={assessment.conciseness.score}
                rationale={assessment.conciseness.rationale}
                suggestion={assessment.conciseness.suggestion}
              />
            </div>
          </section>

          {assessment.dynamicCriteria.length > 0 && (
            <section>
              <SectionLabel>Tuned to {assessment.projectType}</SectionLabel>
              <div className="space-y-4">
                {assessment.dynamicCriteria.map((d) => (
                  <DimensionBar
                    key={d.key}
                    label={d.label}
                    score={d.score}
                    rationale={d.rationale}
                    suggestion={d.suggestion}
                    bestPractice={d.bestPractice}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </aside>
  );
}
