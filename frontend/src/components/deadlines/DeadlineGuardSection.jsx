// Deadline Guard - every date that matters, laid out as a timeline grouped by
// urgency. Groups, counts and day numbers all come from GET /api/deadlines (the
// `urgency` bucket on each item and the `summary` block); nothing is computed
// from hard-coded thresholds here.
import { useMemo, useState } from "react";
import clsx from "clsx";
import { CalendarCheck, ChevronDown, Plus, ScanSearch } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import ConfirmDialog from "../ui/ConfirmDialog";
import PageHeader from "../ui/PageHeader";
import { Skeleton } from "../ui/Skeleton";
import { NoDeadlinesIllustration } from "../illustrations/EmptyIllustrations";
import { useSourceDocument } from "../setu/SourceDocumentViewer";
import DeadlineItem from "./DeadlineItem";
import DeadlineFormModal from "./DeadlineFormModal";
import {
  deleteDeadlineRequest,
  listDeadlinesRequest,
  rescanDeadlinesRequest,
  updateDeadlineRequest,
} from "../../api/deadlines";
import { describeError, useApiData } from "../../hooks/useApiData";
import { useI18n } from "../../hooks/useI18n";
import { useToast } from "../../hooks/useToast";
import { URGENCY, URGENCY_ORDER, urgencyText } from "../../utils/setu";

const fetchAll = () => listDeadlinesRequest("all");

function SummaryStrip({ summary }) {
  const { t } = useI18n();
  return (
    <section aria-label={t("deadlines.summary")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {URGENCY_ORDER.map((key) => {
        const look = URGENCY[key];
        const { label, hint } = urgencyText(key, t);
        return (
          <div key={key} className={clsx("rounded-xl border p-3.5", look.tile)}>
            <p className="text-2xl font-bold tabular-nums">{summary[key] ?? 0}</p>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs">{hint}</p>
          </div>
        );
      })}
    </section>
  );
}

function LoadingState() {
  return (
    <div aria-busy="true">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function DeadlineGuardSection() {
  const { t, tn } = useI18n();
  const { showToast } = useToast();
  const { data, isLoading, error, reload } = useApiData(fetchAll, t("deadlines.loadErrorBody"));
  const { openDocument, loadingId, viewer } = useSourceDocument();

  const [formState, setFormState] = useState({ open: false, deadline: null });
  const [toDelete, setToDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [showDone, setShowDone] = useState(false);

  // Dismissed rows are hidden everywhere; the API still returns them under "all".
  const groups = useMemo(() => {
    const visible = (data?.items ?? []).filter((item) => item.status !== "dismissed");
    return URGENCY_ORDER.map((key) => ({ key, items: visible.filter((item) => item.urgency === key) })).filter(
      (group) => group.items.length > 0
    );
  }, [data]);
  const hasAnything = groups.length > 0;
  const summary = data?.summary;
  const nothingThisMonth = summary && summary.overdue + summary.critical + summary.soon === 0;

  const runAction = async (deadline, action, successMessage) => {
    setBusyId(deadline.id);
    try {
      await action();
      showToast(successMessage, "success");
      await reload({ silent: true });
    } catch (requestError) {
      showToast(describeError(requestError, t("deadlines.error.action")), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleDone = (deadline) => {
    const isDone = deadline.status === "done";
    return runAction(
      deadline,
      () => updateDeadlineRequest(deadline.id, { status: isDone ? "open" : "done" }),
      isDone ? t("deadlines.toast.reopened") : t("deadlines.toast.markedDone")
    );
  };

  const handleDismiss = (deadline) =>
    runAction(deadline, () => updateDeadlineRequest(deadline.id, { status: "dismissed" }), t("deadlines.toast.dismissed"));

  const handleDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await deleteDeadlineRequest(toDelete.id);
      showToast(t("deadlines.toast.deleted"), "success");
      setToDelete(null);
      await reload({ silent: true });
    } catch (requestError) {
      showToast(describeError(requestError, t("deadlines.error.delete")), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRescan = async () => {
    setIsRescanning(true);
    try {
      const { data: result } = await rescanDeadlinesRequest();
      showToast(
        t("deadlines.toast.rescan", {
          docs: tn("deadlines.docCount", result.documents_scanned),
          found: tn("deadlines.dateCount", result.deadlines_found),
          fresh: result.new_deadlines,
        }),
        "success"
      );
      await reload({ silent: true });
    } catch (requestError) {
      showToast(describeError(requestError, t("deadlines.error.rescan")), "error");
    } finally {
      setIsRescanning(false);
    }
  };

  const actions = (
    <>
      <Button variant="secondary" icon={ScanSearch} loading={isRescanning} onClick={handleRescan} className="min-h-[44px]">
        {t("deadlines.rescan")}
      </Button>
      <Button icon={Plus} onClick={() => setFormState({ open: true, deadline: null })} className="min-h-[44px]">
        {t("deadlines.add")}
      </Button>
    </>
  );

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.deadlines")}
        title={t("deadlines.title")}
        description={data?.scope === "workspace" ? t("deadlines.desc.workspace") : t("deadlines.desc.personal")}
        actions={actions}
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title={t("deadlines.loadError")} message={error} onRetry={reload} />
      ) : (
        <>
          <SummaryStrip summary={summary} />

          {hasAnything && nothingThisMonth && (
            <Card className="mt-6 flex items-center gap-3 border-l-4 border-l-green-500 dark:border-l-green-500">
              <CalendarCheck className="h-6 w-6 shrink-0 text-success" aria-hidden="true" />
              <p className="text-sm font-medium text-ink dark:text-slate-100">
                {summary.open === 0 ? t("deadlines.allClear.open") : t("deadlines.allClear.month")}
              </p>
            </Card>
          )}

          {!hasAnything ? (
            <Card className="mt-6">
              <EmptyState
                illustration={NoDeadlinesIllustration}
                title={t("deadlines.emptyTitle")}
                description={t("deadlines.emptyBody")}
                action={actions}
              />
            </Card>
          ) : (
            <div className="mt-8 space-y-9">
              {groups.map(({ key, items }) => {
                const look = URGENCY[key];
                const { label, hint } = urgencyText(key, t);
                const collapsible = key === "done";
                const expanded = !collapsible || showDone;
                return (
                  <section key={key} aria-labelledby={`group-${key}`}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 id={`group-${key}`} className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink dark:text-slate-100">
                        <span className={clsx("h-3 w-3 rounded-full", look.dot)} aria-hidden="true" />
                        {label}
                        <span className={clsx("rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums", look.tile)}>
                          {items.length}
                        </span>
                        <span className="hidden text-xs font-normal text-ink-soft sm:inline">{hint}</span>
                      </h2>
                      {collapsible && (
                        <button
                          type="button"
                          onClick={() => setShowDone((v) => !v)}
                          aria-expanded={showDone}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:text-primary-dark dark:text-primary-100"
                        >
                          {showDone ? t("deadlines.hide") : t("deadlines.show")}
                          <ChevronDown className={clsx("h-4 w-4 transition-transform", showDone && "rotate-180")} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {expanded && (
                      <ol className="relative ml-1.5 space-y-4 border-l-2 border-line pl-5 dark:border-slate-700 sm:ml-2 sm:pl-6">
                        {items.map((deadline) => (
                          <li key={deadline.id} className="relative">
                            <span
                              aria-hidden="true"
                              className={clsx(
                                "absolute -left-[27px] top-6 h-3.5 w-3.5 rounded-full ring-4 ring-app dark:ring-slate-950 sm:-left-[33px]",
                                look.dot
                              )}
                            />
                            <DeadlineItem
                              deadline={deadline}
                              isBusy={busyId === deadline.id}
                              isOpeningDocument={loadingId === deadline.document_id}
                              onToggleDone={handleToggleDone}
                              onEdit={(item) => setFormState({ open: true, deadline: item })}
                              onDismiss={handleDismiss}
                              onDelete={setToDelete}
                              onOpenDocument={openDocument}
                            />
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <DeadlineFormModal
        isOpen={formState.open}
        deadline={formState.deadline}
        onClose={() => setFormState((s) => ({ ...s, open: false }))}
        onSaved={() => reload({ silent: true })}
      />
      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title={t("deadlines.confirm.title")}
        description={toDelete ? t("deadlines.confirm.body", { label: toDelete.label }) : ""}
        confirmLabel={t("common.delete")}
        isLoading={isDeleting}
      />
      {viewer}
    </div>
  );
}
