// One deadline card on the timeline. All values (label, kind, date, days left,
// urgency, source, evidence) come from the API record; this only decides how to
// show them. The calendar tile on the left is the date at a glance.
import clsx from "clsx";
import { Check, FileText, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import Badge from "../ui/Badge";
import { useI18n } from "../../hooks/useI18n";
import { ICON_BUTTON_CLASS, URGENCY, daysText, kindText, parseIsoDate } from "../../utils/setu";

function DateTile({ value, look, locale }) {
  const date = parseIsoDate(value);
  return (
    <div
      className={clsx(
        "hidden w-14 shrink-0 flex-col items-center justify-center rounded-xl border py-2 text-center sm:flex",
        look.tile
      )}
      aria-hidden="true"
    >
      <span className="text-[11px] font-bold uppercase leading-none tracking-wide">
        {date.toLocaleDateString(locale, { month: "short" })}
      </span>
      <span className="mt-0.5 text-xl font-extrabold leading-none tabular-nums">{date.getDate()}</span>
      <span className="mt-0.5 text-[10px] leading-none">{date.getFullYear()}</span>
    </div>
  );
}

export default function DeadlineItem({
  deadline,
  isBusy,
  isOpeningDocument,
  onToggleDone,
  onEdit,
  onDismiss,
  onDelete,
  onOpenDocument,
}) {
  const { t, tn, locale } = useI18n();
  const look = URGENCY[deadline.urgency] ?? URGENCY.upcoming;
  const isDone = deadline.status === "done";
  const isManual = deadline.source === "manual";
  const sourceLabel = t(`deadlines.source.${deadline.source}`);
  const dateText = parseIsoDate(deadline.due_date).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <article
      className={clsx(
        "rounded-2xl border border-line bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900",
        isDone && "opacity-80"
      )}
    >
      <div className="flex gap-4">
        <DateTile value={deadline.due_date} look={look} locale={locale} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={clsx(
                    "break-words text-[15px] font-semibold text-ink dark:text-slate-100",
                    isDone && "line-through decoration-slate-400"
                  )}
                >
                  {deadline.label}
                </h3>
                <Badge tone="neutral">{kindText(deadline.kind, t)}</Badge>
              </div>

              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                <span className="sm:hidden">{dateText}</span>
                {isDone ? (
                  <Badge tone="success">{t("deadlines.done")}</Badge>
                ) : (
                  <Badge tone={look.tone} className="font-semibold">
                    {daysText(deadline.days_left, t, tn)}
                  </Badge>
                )}
                <Badge tone={isManual ? "primary" : "info"}>{sourceLabel}</Badge>
              </p>

              {deadline.notes && <p className="mt-2 break-words text-sm text-ink dark:text-slate-300">{deadline.notes}</p>}

              {!isManual && deadline.evidence && (
                <p className="mt-2 break-words rounded-lg bg-slate-50 px-3 py-2 text-xs text-ink-soft dark:bg-slate-800/60">
                  {t("deadlines.fromDocument", { evidence: deadline.evidence })}
                </p>
              )}

              {deadline.document_id && (
                <button
                  type="button"
                  onClick={() => onOpenDocument(deadline.document_id)}
                  disabled={isOpeningDocument}
                  className="mt-1 inline-flex min-h-[44px] max-w-full items-center gap-1.5 rounded-lg text-sm font-semibold text-primary hover:text-primary-dark disabled:opacity-60 dark:text-primary-100"
                >
                  <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {isOpeningDocument
                      ? t("deadlines.opening")
                      : deadline.document_title
                        ? t("deadlines.openDocumentTitle", { title: deadline.document_title })
                        : t("deadlines.openDocument")}
                  </span>
                </button>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
              <button
                type="button"
                onClick={() => onToggleDone(deadline)}
                disabled={isBusy}
                className={ICON_BUTTON_CLASS}
                aria-label={isDone ? t("deadlines.aria.reopen", { label: deadline.label }) : t("deadlines.aria.markDone", { label: deadline.label })}
                title={isDone ? t("deadlines.tip.reopen") : t("deadlines.tip.markDone")}
              >
                {isDone ? <RotateCcw className="h-[18px] w-[18px]" /> : <Check className="h-[18px] w-[18px] text-success" />}
              </button>
              <button
                type="button"
                onClick={() => onEdit(deadline)}
                disabled={isBusy}
                className={ICON_BUTTON_CLASS}
                aria-label={t("deadlines.aria.edit", { label: deadline.label })}
                title={t("deadlines.tip.edit")}
              >
                <Pencil className="h-[18px] w-[18px]" />
              </button>
              {isManual ? (
                <button
                  type="button"
                  onClick={() => onDelete(deadline)}
                  disabled={isBusy}
                  className={ICON_BUTTON_CLASS}
                  aria-label={t("deadlines.aria.delete", { label: deadline.label })}
                  title={t("deadlines.tip.delete")}
                >
                  <Trash2 className="h-[18px] w-[18px] text-danger" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onDismiss(deadline)}
                  disabled={isBusy}
                  className={ICON_BUTTON_CLASS}
                  aria-label={t("deadlines.aria.dismiss", { label: deadline.label })}
                  title={t("deadlines.tip.dismiss")}
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
