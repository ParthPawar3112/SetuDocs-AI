// Recorded trials + the manual-vs-SetuDocs comparison. The comparison only
// appears once the API reports basis "measured" (3+ trials per method).
// The API can only clear the signed-in person's trials as a whole, so that is
// the one delete action offered here.
import { useState } from "react";
import { Timer, Trash2 } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import ConfirmDialog from "../ui/ConfirmDialog";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import { Skeleton } from "../ui/Skeleton";
import { clearTrialsRequest } from "../../api/impact";
import { describeError } from "../../hooks/useApiData";
import { useI18n } from "../../hooks/useI18n";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../utils/format";
import { parseServerDate, secondsText } from "../../utils/setu";

function ComparisonBars({ time }) {
  const { t } = useI18n();
  const rows = [
    { key: "manual", label: t("impact.watch.manual"), stats: time.manual, bar: "bg-slate-400 dark:bg-slate-500" },
    { key: "setudocs", label: t("impact.watch.setudocs"), stats: time.setudocs, bar: "bg-primary" },
  ];
  const max = Math.max(...rows.map((r) => r.stats.average_seconds ?? 0), 1);

  return (
    <div>
      <div className="space-y-3">
        {rows.map(({ key, label, stats, bar }) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-ink dark:text-slate-200">
                {label} <span className="text-xs font-normal text-ink-soft">{t("impact.trials.count", { count: stats.count })}</span>
              </span>
              <span className="font-bold tabular-nums text-ink dark:text-slate-100">{secondsText(stats.average_seconds, t)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full rounded-full ${bar}`} style={{ width: `${((stats.average_seconds ?? 0) / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      {time.speedup != null && (
        <p className="mt-3 text-sm font-semibold text-ink dark:text-slate-100">{t("impact.trials.speedLine", { x: time.speedup })}</p>
      )}
    </div>
  );
}

export default function TrialsCard({ time, trials, isLoading, error, onRetry, onChanged, scope }) {
  const { t, tn } = useI18n();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      const { data } = await clearTrialsRequest();
      showToast(tn("impact.trials.removed", data.removed), "success");
      setConfirmOpen(false);
      onChanged();
    } catch (requestError) {
      showToast(describeError(requestError, t("impact.trials.clearError")), "error");
    } finally {
      setIsClearing(false);
    }
  };

  const measured = time.basis === "measured";

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink dark:text-slate-100">{t("impact.trials.title")}</h2>
        <Badge tone={measured ? "success" : "neutral"}>{measured ? t("impact.trials.measured") : t("impact.trials.notEnough")}</Badge>
      </div>

      <div className="mt-4">
        {measured ? (
          <ComparisonBars time={time} />
        ) : (
          <p className="text-sm text-ink-soft">
            {t("impact.trials.needMore", {
              min: time.min_trials,
              manual: time.manual.count,
              setu: time.setudocs.count,
            })}
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-line pt-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("impact.trials.recorded")}</h3>
          {trials?.length > 0 && (
            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setConfirmOpen(true)} className="min-h-[44px]">
              {t("impact.trials.clear")}
            </Button>
          )}
        </div>
        {scope === "workspace" && trials?.length > 0 && (
          <p className="mt-1 text-xs text-ink-soft">{t("impact.trials.workspaceNote")}</p>
        )}

        {isLoading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-3">
            <ErrorState title={t("impact.trials.loadError")} message={error} onRetry={onRetry} />
          </div>
        ) : trials.length === 0 ? (
          <EmptyState icon={Timer} title={t("impact.trials.emptyTitle")} description={t("impact.trials.emptyBody")} className="py-8" />
        ) : (
          <ul className="mt-3 divide-y divide-line dark:divide-slate-800">
            {trials.map((trial) => (
              <li key={trial.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink dark:text-slate-100">
                    <Badge tone={trial.method === "manual" ? "neutral" : "primary"}>
                      {trial.method === "manual" ? t("impact.trials.manual") : t("impact.trials.setudocs")}
                    </Badge>
                    <span className="tabular-nums">{secondsText(trial.seconds, t)}</span>
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    {formatDateTime(parseServerDate(trial.created_at))}
                    {trial.note ? ` · ${trial.note}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleClear}
        title={t("impact.trials.confirmTitle")}
        description={t("impact.trials.confirmBody")}
        confirmLabel={t("impact.trials.confirmButton")}
        isLoading={isClearing}
      />
    </Card>
  );
}
