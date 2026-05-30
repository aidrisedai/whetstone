import type { Lesson } from "@/lib/types";

export function LessonCard({ lesson, loading }: { lesson: Lesson | null; loading: boolean }) {
  return (
    <div className="animate-rise rounded-2xl border border-steel/30 bg-gradient-to-b from-steel/10 to-panel/40 p-5">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-steel">
        One thing to take with you
      </div>

      {loading || !lesson ? (
        <div className="space-y-3">
          <div className="h-6 w-2/5 animate-pulse rounded bg-panel2" />
          <div className="h-4 w-full animate-pulse rounded bg-panel2" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-panel2" />
        </div>
      ) : (
        <div className="space-y-2.5">
          <h3 className="font-display text-2xl font-bold leading-tight text-ink">{lesson.title}</h3>
          <p className="text-[15px] leading-relaxed text-ink">{lesson.lesson}</p>
          <p className="text-sm leading-relaxed text-muted">{lesson.why}</p>
        </div>
      )}
    </div>
  );
}
