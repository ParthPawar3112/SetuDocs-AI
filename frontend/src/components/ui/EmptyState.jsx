// Empty screens are designed, not blank: pass `illustration` (one of the
// components in illustrations/EmptyIllustrations) for the full-size artwork, or
// `icon` for the small chip used in tight spots. `action` is an optional
// call-to-action rendered under the text.
import Badge from "./Badge";

export default function EmptyState({
  icon: Icon,
  illustration: Illustration,
  title,
  description,
  phase,
  action,
  className,
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-10 text-center ${className || ""}`}>
      {Illustration ? (
        <Illustration className="mb-3" />
      ) : (
        Icon && (
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 dark:bg-primary/15">
            <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} aria-hidden="true" />
          </div>
        )
      )}
      <h3 className="text-base font-semibold text-ink dark:text-slate-100">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-soft dark:text-slate-400">{description}</p>
      {phase && (
        <Badge tone="primary" className="mt-4">
          {phase}
        </Badge>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
