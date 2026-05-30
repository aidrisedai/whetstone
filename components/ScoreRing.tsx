import { scoreHex, scoreLabel } from "./score-style";

export function ScoreRing({
  overall,
  threshold,
  ready,
}: {
  overall: number;
  threshold: number;
  ready: boolean;
}) {
  const size = 168;
  const stroke = 12;
  const center = size / 2;
  const r = center - stroke;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, overall));
  const offset = circumference * (1 - clamped / 100);
  const hex = scoreHex(clamped);

  // Threshold tick (drawn inside the -90°-rotated svg, so it aligns with the arc).
  const a = 2 * Math.PI * (threshold / 100);
  const inner = r - stroke / 2 - 2;
  const outer = r + stroke / 2 + 2;
  const tick = {
    x1: center + inner * Math.cos(a),
    y1: center + inner * Math.sin(a),
    x2: center + outer * Math.cos(a),
    y2: center + outer * Math.sin(a),
  };

  return (
    <div className="relative grid place-items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={center} cy={center} r={r} fill="none" stroke="#1B1F26" strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={hex}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease, stroke 400ms ease" }}
        />
        <line
          x1={tick.x1}
          y1={tick.y1}
          x2={tick.x2}
          y2={tick.y2}
          stroke="#EAEDF2"
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.65}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="font-display text-5xl font-bold leading-none tabular-nums"
          style={{ color: hex }}
        >
          {clamped}
        </span>
        <span
          className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.2em]"
          style={{ color: hex }}
        >
          {ready ? "ready ✦" : scoreLabel(clamped)}
        </span>
      </div>
    </div>
  );
}
