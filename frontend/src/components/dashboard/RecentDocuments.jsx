import Card from "../ui/Card";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import StatusBadge from "../documents/StatusBadge";
import { NoDocumentsIllustration } from "../illustrations/EmptyIllustrations";
import { Skeleton } from "../ui/Skeleton";
import { useI18n } from "../../hooks/useI18n";
import { formatDateTime } from "../../utils/format";

const COLUMN_KEYS = ["dash.col.document", "dash.col.department", "dash.col.status", "dash.col.uploadedBy", "dash.col.date"];

export default function RecentDocuments({ documents, isLoading, onNavigate, onUpload }) {
  const { t } = useI18n();

  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-2 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-ink dark:text-slate-100">{t("dash.recent.title")}</h2>
        {documents.length > 0 && (
          <button
            onClick={() => onNavigate("documents")}
            className="inline-flex min-h-[44px] items-center px-1 text-xs font-semibold text-primary hover:text-primary-dark dark:text-primary-100"
          >
            {t("common.viewAll")}
          </button>
        )}
      </div>

      {!isLoading && documents.length === 0 ? (
        <EmptyState
          illustration={NoDocumentsIllustration}
          title={t("dash.recent.emptyTitle")}
          description={t("dash.recent.emptyBody")}
          action={
            onUpload && (
              <Button onClick={onUpload} className="min-h-[44px]">
                {t("dash.uploadCta")}
              </Button>
            )
          }
        />
      ) : (
        <div className="max-h-[420px] overflow-auto" tabIndex={0} role="region" aria-label={t("dash.recent.title")}>
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft dark:border-slate-800">
                {COLUMN_KEYS.map((key) => (
                  <th key={key} scope="col" className="whitespace-nowrap px-5 py-3 font-semibold">
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-slate-800">
              {isLoading && (
                <tr>
                  <td className="px-5 py-4" colSpan={COLUMN_KEYS.length}>
                    <Skeleton className="h-5 w-full rounded-md" />
                  </td>
                </tr>
              )}
              {!isLoading &&
                documents.map((doc) => (
                  <tr key={doc.id} className="transition-colors even:bg-slate-50/60 hover:bg-primary-50/60 dark:even:bg-slate-800/30 dark:hover:bg-slate-800/60">
                    <td className="max-w-[220px] truncate px-5 py-3.5 font-medium text-ink dark:text-slate-100">{doc.title}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">{doc.department}</td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <StatusBadge status={doc.lifecycle_status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">{doc.uploaded_by}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">{formatDateTime(new Date(doc.upload_date))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
