import { Download, Edit3, Eye, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import StatusBadge from "./StatusBadge";
import HighlightedText from "./HighlightedText";
import VerificationBadge from "../verification/VerificationBadge";
import { NoDocumentsIllustration, NoSearchResultsIllustration } from "../illustrations/EmptyIllustrations";
import { useI18n } from "../../hooks/useI18n";
import { formatDateTime, isImageFile } from "../../utils/format";

const COLUMN_KEYS = ["dash.col.document", "dash.col.department", "dash.col.uploadedBy", "docs.col.uploadDate", "dash.col.status", "docs.col.actions"];

function FileTypeIcon({ filetype }) {
  const Icon = isImageFile(filetype) ? ImageIcon : FileText;
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 dark:bg-primary/15">
      <Icon className="h-4 w-4 text-primary" />
    </span>
  );
}

function ActionButton({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid h-11 w-11 place-items-center rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
        danger ? "text-ink-soft hover:text-danger" : "text-ink-soft hover:text-primary"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export default function DocumentsTable({
  documents,
  isLoading,
  hasActiveFilters,
  searchQuery,
  onView,
  onDownload,
  onEdit,
  onDelete,
}) {
  const { t } = useI18n();
  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="max-h-[70vh] overflow-auto" tabIndex={0} role="region" aria-label={t("nav.documents")}>
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
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4" colSpan={COLUMN_KEYS.length}>
                    <Skeleton className="h-5 w-full rounded-md" />
                  </td>
                </tr>
              ))}

            {!isLoading && documents.length === 0 && (
              <tr>
                <td colSpan={COLUMN_KEYS.length}>
                  {hasActiveFilters ? (
                    <EmptyState
                      illustration={NoSearchResultsIllustration}
                      title={t("empty.search.title")}
                      description={t("empty.search.body")}
                    />
                  ) : (
                    <EmptyState
                      illustration={NoDocumentsIllustration}
                      title={t("empty.documents.title")}
                      description={t("empty.documents.body")}
                    />
                  )}
                </td>
              </tr>
            )}

            {!isLoading &&
              documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="animate-fadeIn transition-colors even:bg-slate-50/60 hover:bg-primary-50/60 dark:even:bg-slate-800/30 dark:hover:bg-slate-800/60"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <FileTypeIcon filetype={doc.filetype} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink dark:text-slate-100">
                          <HighlightedText text={doc.title} query={searchQuery} />
                        </p>
                        <p className="truncate text-xs text-ink-soft">
                          <HighlightedText text={doc.original_filename} query={searchQuery} />
                        </p>
                        {doc.ai_title && doc.ai_title !== doc.title && (
                          <p className="truncate text-xs text-primary">
                            AI: <HighlightedText text={doc.ai_title} query={searchQuery} />
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">{doc.department}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">{doc.uploaded_by}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">
                    {formatDateTime(new Date(doc.upload_date))}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={doc.lifecycle_status} />
                      {doc.verification?.status && doc.verification.status !== "UNVERIFIED" && (
                        <VerificationBadge status={doc.verification.status} size="sm" />
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <div className="flex items-center gap-0.5">
                      <ActionButton icon={Eye} label={t("docs.action.view")} onClick={() => onView(doc)} />
                      <ActionButton icon={Download} label={t("docs.action.download")} onClick={() => onDownload(doc)} />
                      <ActionButton icon={Edit3} label={t("docs.action.edit")} onClick={() => onEdit(doc)} />
                      <ActionButton icon={Trash2} label={t("docs.action.delete")} danger onClick={() => onDelete(doc)} />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
