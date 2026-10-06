// Headline number card for the Impact screen. Unlike StatCard it has a free
// `children` slot for the honesty label / explanatory note, instead of a fixed
// trend line.
import clsx from "clsx";
import Card from "../ui/Card";

const BORDER_TONES = {
  primary: "border-l-primary dark:border-l-primary",
  warning: "border-l-warning dark:border-l-warning",
  success: "border-l-success dark:border-l-success",
  danger: "border-l-danger dark:border-l-danger",
};

const ICON_TONES = {
  primary: "bg-primary-50 text-primary dark:bg-primary/15",
  warning: "bg-amber-50 text-warning dark:bg-amber-500/15",
  success: "bg-green-50 text-success dark:bg-green-500/15",
  danger: "bg-red-50 text-danger dark:bg-red-500/15",
};

export default function MetricCard({ label, value, icon: Icon, tone = "primary", children }) {
  return (
    <Card className={clsx("border-l-4", BORDER_TONES[tone])}>
      <div className="flex items-center gap-3">
        <span className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-xl", ICON_TONES[tone])}>
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-ink-soft">{label}</p>
      </div>
      <p className="mt-4 break-words text-3xl font-bold tabular-nums text-ink dark:text-slate-100">{value}</p>
      {children && <div className="mt-2 space-y-1.5 text-xs text-ink-soft">{children}</div>}
    </Card>
  );
}
