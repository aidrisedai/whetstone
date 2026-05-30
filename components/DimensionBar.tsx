import { prettyPractice, scoreHex } from "./score-style";

interface DimensionBarProps {
  label: string;
  score: number;
  rationale: string;
  suggestion: string;
  /** Best-practice key for dynamic dimensions; omitted for the fixed two. */
  bestPractice?: string;
}

export function DimensionBar({ label, score, rationale, suggestion, bestPractice }: DimensionBarProps) {
  const hex = scoreHex(score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{label}</span>
          {bestPractice && (
            <span className="rounded-full border border-line bg-panel2 px-1.5 py-0.5 font-mono text-[10px] lowercase tracking-tight text-muted">
              {prettyPractice(bestPractice)}
            </span>
          )}
        </div>
        <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: hex }}>
          {score}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-panel2">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${score}%`, backgroundColor: hex }}
        />
      </div>

      <p className="text-xs leading-snug text-muted">{rationale}</p>
      {suggestion && (
        <p className="text-xs leading-snug text-ember-soft">
          <span aria-hidden>→ </span>
          {suggestion}
        </p>
      )}
    </div>
  );
}
