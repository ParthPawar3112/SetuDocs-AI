// "My Documents" - an individual / business owner's own submissions only. The
// list comes from GET /api/citizen/documents, which is server-scoped to the
// caller; there is no repository-wide search here by design. Silent 3s re-poll
// while any row is still mid-pipeline, same approach as DocumentsSection.
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Upload } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import PageHeader from "../ui/PageHeader";
import { Skeleton } from "../ui/Skeleton";
import StatusBadge from "../documents/StatusBadge";
import { NoDocumentsIllustration } from "../illustrations/EmptyIllustrations";
import CitizenDocumentModal from "./CitizenDocumentModal";
import { getCitizenDocumentsRequest } from "../../api/citizen";
import { describeError } from "../../hooks/useApiData";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../hooks/useI18n";
import { formatDateTime } from "../../utils/format";

const IN_FLIGHT = new Set(["Uploaded", "OCR Processing", "AI Processing"]);

export default function CitizenDocumentsSection({ onNavigate }) {
  const { t, tOr } = useI18n();
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const fetchDocuments = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const { data } = await getCitizenDocumentsRequest();
        setDocuments(data);
        setError("");
      } catch (requestError) {
        if (!silent) setError(describeError(requestError, t("common.error.generic")));
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const anyInFlight = documents.some((doc) => IN_FLIGHT.has(doc.lifecycle_status));
    if (!anyInFlight) return undefined;
    const interval = setInterval(() => fetchDocuments(true), 3000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const stage = (value) => tOr(`stage.${value}`, value);

  return (
    <div>
      <PageHeader
        eyebrow={t("myDocs.eyebrow")}
        title={t("myDocs.title")}
        description={t("myDocs.subtitle", { name: user?.full_name || user?.username })}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={() => fetchDocuments()} className="min-h-[44px]">
            {t("myDocs.refresh")}
          </Button>
        }
      />

      {error ? (
        <ErrorState title={t("myDocs.loadError")} message={error} onRetry={() => fetchDocuments()} />
      ) : (
        <Card padding="p-0" className="overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-5" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              illustration={NoDocumentsIllustration}
              title={t("myDocs.emptyTitle")}
              description={t("myDocs.emptyBody")}
              action={
                onNavigate && (
                  <Button icon={Upload} onClick={() => onNavigate("upload")} className="min-h-[44px]">
                    {t("dash.uploadCta")}
                  </Button>
                )
              }
            />
          ) : (
            <div className="max-h-[70vh] overflow-auto" tabIndex={0} role="region" aria-label={t("myDocs.title")}>
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
                  <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft dark:border-slate-800">
                    <th scope="col" className="px-5 py-3">{t("myDocs.col.document")}</th>
                    <th scope="col" className="px-5 py-3">{t("myDocs.col.submitted")}</th>
                    <th scope="col" className="px-5 py-3">{t("myDocs.col.status")}</th>
                    <th scope="col" className="px-5 py-3">{t("myDocs.col.ocr")}</th>
                    <th scope="col" className="px-5 py-3">{t("myDocs.col.ai")}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => setSelected(doc)}
                      className="cursor-pointer border-b border-line transition-colors last:border-0 even:bg-slate-50/60 hover:bg-primary-50/60 dark:border-slate-800 dark:even:bg-slate-800/30 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-5 py-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(doc);
                          }}
                          aria-label={t("myDocs.open", { title: doc.title })}
                          className="min-h-[44px] max-w-[260px] truncate text-left font-medium text-ink hover:text-primary dark:text-slate-100"
                        >
                          {doc.title}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-soft">{formatDateTime(new Date(doc.upload_date))}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={doc.lifecycle_status} />
                      </td>
                      <td className="px-5 py-3 text-ink-soft">{stage(doc.ocr_status)}</td>
                      <td className="px-5 py-3 text-ink-soft">{stage(doc.ai_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <CitizenDocumentModal
        isOpen={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          fetchDocuments(true);
        }}
        document={selected}
      />
    </div>
  );
}
