// One labelled input for the login / signup forms: icon, optional trailing
// control (the show/hide password button), and an accessible inline error.
import { useId } from "react";
import clsx from "clsx";
import { AlertCircle } from "lucide-react";

export default function AuthField({ label, icon: Icon, error, trailing, className, ...inputProps }) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-soft"
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          className={clsx(
            "h-[52px] w-full rounded-xl border bg-slate-50/70 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800",
            Icon ? "pl-12" : "pl-4",
            trailing ? "pr-14" : "pr-3",
            error
              ? "border-danger focus:border-danger focus:ring-danger/15"
              : "border-line focus:border-primary focus:ring-primary/10 dark:border-slate-700",
            className
          )}
          {...inputProps}
        />
        {trailing && <div className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
