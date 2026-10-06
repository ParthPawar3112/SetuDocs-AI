// Shared "something went wrong" panel with a Retry button, so every data screen
// fails the same way instead of showing a blank page.
import { AlertTriangle, RefreshCw } from "lucide-react";
import Button from "./Button";
import { useI18n } from "../../hooks/useI18n";

export default function ErrorState({ title, message, onRetry }) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/60 px-6 py-10 text-center dark:border-red-900/60 dark:bg-red-500/10"
    >
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-red-100 dark:bg-red-500/20">
        <AlertTriangle className="h-6 w-6 text-danger" />
      </span>
      <h3 className="text-sm font-semibold text-ink dark:text-slate-100">{title ?? t("states.error.title")}</h3>
      {message && <p className="mt-1.5 max-w-md text-sm text-ink-soft dark:text-slate-400">{message}</p>}
      {onRetry && (
        <Button variant="secondary" icon={RefreshCw} onClick={onRetry} className="mt-5 min-h-[44px]">
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
