// Original empty-state illustrations in the brand blue. Each is decorative
// (aria-hidden) - the title and description next to it carry the meaning. Colours
// use Tailwind fill/stroke classes so they switch cleanly in dark mode.
import clsx from "clsx";
import Logo from "../Logo";

const PAGE = "fill-white stroke-primary-100 dark:fill-slate-800 dark:stroke-slate-600";
const PAGE_FRONT = "fill-white stroke-primary dark:fill-slate-800 dark:stroke-primary-100";
const BLOB = "fill-primary-50 dark:fill-primary/10";
const LINE = "stroke-primary-100 dark:stroke-slate-600";
const ACCENT = "stroke-primary dark:stroke-primary-100";
const ACCENT_FILL = "fill-primary dark:fill-primary-100";

function Frame({ children, className }) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={clsx("mx-auto h-36 w-auto max-w-full sm:h-40", className)}
    >
      {children}
    </svg>
  );
}

function Sparkle({ x, y, size = 6 }) {
  return (
    <path
      d={`M${x} ${y - size}V${y + size}M${x - size} ${y}H${x + size}`}
      className={ACCENT}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  );
}

// First-run "no documents" state shows the brand seal instead of drawn artwork.
export function NoDocumentsIllustration({ className }) {
  return <Logo variant="seal" size={112} className={clsx("mx-auto", className)} />;
}

export function NoDeadlinesIllustration({ className }) {
  return (
    <Frame className={className}>
      <ellipse cx="120" cy="100" rx="88" ry="66" className={BLOB} />
      <rect x="62" y="44" width="116" height="100" rx="14" className={PAGE_FRONT} strokeWidth="3" />
      <path d="M62 72h116" className={ACCENT} strokeWidth="3" />
      <path d="M62 58a14 14 0 0 1 14-14h88a14 14 0 0 1 14 14v14H62Z" className="fill-primary-100 dark:fill-primary/25" />
      <path d="M92 34v20M148 34v20" className={ACCENT} strokeWidth="5" strokeLinecap="round" />
      <circle cx="120" cy="108" r="22" className="fill-green-50 stroke-green-500 dark:fill-green-500/10" strokeWidth="3" />
      <path d="m110 108 7 7 14-15" className="stroke-green-500" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <Sparkle x={196} y={56} />
      <Sparkle x={44} y={96} size={5} />
    </Frame>
  );
}

export function NoSchemesIllustration({ className }) {
  return (
    <Frame className={className}>
      <ellipse cx="120" cy="100" rx="88" ry="66" className={BLOB} />
      {/* an original civic building: pediment, columns, steps */}
      <path d="M64 70 120 40l56 30Z" className={PAGE_FRONT} strokeWidth="3" strokeLinejoin="round" />
      <path d="M78 82v44M102 82v44M126 82v44M150 82v44" className={ACCENT} strokeWidth="6" strokeLinecap="round" />
      <path d="M62 132h116M54 146h132" className={ACCENT} strokeWidth="5" strokeLinecap="round" />
      <circle cx="162" cy="62" r="22" className="fill-white stroke-primary dark:fill-slate-800 dark:stroke-primary-100" strokeWidth="3.5" />
      <path d="M178 78l16 16" className={ACCENT} strokeWidth="5" strokeLinecap="round" />
      <path d="M155 58a7 7 0 1 1 9 6.6c-1.6.6-2 1.4-2 3" className={ACCENT} strokeWidth="3" strokeLinecap="round" />
      <circle cx="162" cy="75" r="2" className={ACCENT_FILL} />
      <Sparkle x={52} y={60} />
    </Frame>
  );
}

export function NoSearchResultsIllustration({ className }) {
  return (
    <Frame className={className}>
      <ellipse cx="120" cy="100" rx="88" ry="66" className={BLOB} />
      <rect x="68" y="40" width="88" height="110" rx="10" className={PAGE_FRONT} strokeWidth="3" />
      <path d="M82 66h44M82 82h56M82 98h30" className={LINE} strokeWidth="5" strokeLinecap="round" />
      <circle cx="148" cy="112" r="28" className="fill-white/90 stroke-primary dark:fill-slate-900/80 dark:stroke-primary-100" strokeWidth="4" />
      <path d="m168 132 20 20" className={ACCENT} strokeWidth="7" strokeLinecap="round" />
      <path d="M137 105l22 14M159 105l-22 14" className={ACCENT} strokeWidth="3.5" strokeLinecap="round" />
      <Sparkle x={196} y={58} />
      <Sparkle x={50} y={118} size={5} />
    </Frame>
  );
}

export function NoDataIllustration({ className }) {
  return (
    <Frame className={className}>
      <ellipse cx="120" cy="100" rx="88" ry="66" className={BLOB} />
      <path d="M58 140h124" className={LINE} strokeWidth="4" strokeLinecap="round" />
      <rect x="72" y="104" width="22" height="36" rx="5" className="fill-primary-100 dark:fill-primary/25" />
      <rect x="109" y="80" width="22" height="60" rx="5" className="fill-primary-100 dark:fill-primary/25" />
      <rect x="146" y="58" width="22" height="82" rx="5" className="fill-primary-100 dark:fill-primary/25" />
      <path d="M70 94c22-4 38-20 58-30 16-8 28-6 44-18" className={ACCENT} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 8" />
      <Sparkle x={190} y={44} />
    </Frame>
  );
}
