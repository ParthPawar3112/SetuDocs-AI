// Circular readiness meter: how many of a scheme's required documents the
// person already has, as a ring with the percentage in the middle.
export default function ReadinessRing({ percent, label, size = 64 }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const tone = value >= 80 ? "text-success" : value >= 40 ? "text-primary dark:text-primary-100" : "text-amber-600 dark:text-amber-400";

  return (
    <div
      role="img"
      aria-label={`${label}: ${value}%`}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="6" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className={`stroke-current transition-[stroke-dashoffset] duration-700 ease-out ${tone}`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[13px] font-extrabold tabular-nums text-ink dark:text-slate-100">
        {value}%
      </span>
    </div>
  );
}
