import { ClipboardCheck } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import StatusBadge from "../documents/StatusBadge";
import { useI18n } from "../../hooks/useI18n";

export default function PendingApprovals({ documents, isLoading, onNavigate }) {
  const { t } = useI18n();

  return (
    <Card padding="p-0">
      <div className="flex items-center justify-between border-b border-line px-5 py-2 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-ink dark:text-slate-100">{t("dash.pending.title")}</h2>
        {documents.length > 0 && (
          <button
            onClick={() => onNavigate("workflow")}
            className="inline-flex min-h-[44px] items-center px-1 text-xs font-semibold text-primary hover:text-primary-dark dark:text-primary-100"
          >
            {t("dash.pending.review")}
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3 p-5">
          <Skeleton className="h-5 w-full rounded-md" />
          <Skeleton className="h-5 w-3/4 rounded-md" />
        </div>
      )}

      {!isLoading && documents.length === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title={t("dash.pending.emptyTitle")}
          description={t("dash.pending.emptyBody")}
        />
      )}

      {!isLoading && documents.length > 0 && (
        <ul className="divide-y divide-line dark:divide-slate-800">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                onClick={() => onNavigate("workflow")}
                className="flex min-h-[56px] w-full items-center justify-between gap-3 px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink dark:text-slate-100">{doc.title}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {doc.department} &middot; {doc.uploaded_by}
                  </p>
                </div>
                <StatusBadge status={doc.lifecycle_status} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-line px-5 py-3 text-xs text-ink-soft dark:border-slate-800">{t("dash.pending.note")}</p>
    </Card>
  );
}
