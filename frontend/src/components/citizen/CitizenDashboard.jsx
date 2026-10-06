// Landing page for an individual / business owner (the "Citizen" role). Leads
// with due dates, schemes and time saved, then a place to drop paperwork, then
// the person's own recent documents; plain counts sit at the bottom.
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, FileText, Hash, RotateCcw, Upload, XCircle } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import PageHeader from "../ui/PageHeader";
import ErrorState from "../ui/ErrorState";
import EmptyState from "../ui/EmptyState";
import { StatCardSkeleton } from "../ui/Skeleton";
import StatCard from "../dashboard/StatCard";
import HomeInsightCards from "../dashboard/HomeInsightCards";
import UploadHero from "../dashboard/UploadHero";
import StatusBadge from "../documents/StatusBadge";
import UploadModal from "../documents/UploadModal";
import { NoDocumentsIllustration } from "../illustrations/EmptyIllustrations";
import CitizenDocumentModal from "./CitizenDocumentModal";
import { greetingKey } from "../dashboard/DashboardHome";
import { getCitizenDashboardRequest } from "../../api/citizen";
import { describeError } from "../../hooks/useApiData";
import { useI18n } from "../../hooks/useI18n";
import { formatDateTime } from "../../utils/format";

const EMPTY_STATS = {
  total: 0,
  processing: 0,
  awaiting_review: 0,
  needs_correction: 0,
  approved: 0,
  rejected: 0,
};

export default function CitizenDashboard({ user, onNavigate }) {
  const { t, tn, locale } = useI18n();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const { data: payload } = await getCitizenDashboardRequest();
      setData(payload);
    } catch (requestError) {
      setError(describeError(requestError, t("common.error.generic")));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startUpload = (file = null) => {
    setUploadFile(file);
    setIsUploadOpen(true);
  };

  const stats = data?.stats ?? EMPTY_STATS;
  const fullName = data?.full_name || user.full_name || user.username;
  const citizenId = data?.citizen_id || user.citizen_id;
  const recent = data?.recent ?? [];
  const today = new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const cards = [
    { key: "total", label: t("dash.stat.total"), value: stats.total, icon: FileText, tone: "primary" },
    { key: "processing", label: t("dash.stat.processing"), value: stats.processing, icon: Clock, tone: "warning" },
    { key: "needs_correction", label: t("dash.stat.needsCorrection"), value: stats.needs_correction, icon: RotateCcw, tone: "danger" },
    { key: "approved", label: t("dash.stat.approved"), value: stats.approved, icon: CheckCircle2, tone: "success" },
    { key: "rejected", label: t("dash.stat.rejected"), value: stats.rejected, icon: XCircle, tone: "danger" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={today}
        title={t(greetingKey(), { name: fullName })}
        description={t("dash.subtitle")}
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate("my-documents")} className="min-h-[44px]">
              {t("citizenHome.myDocs")}
            </Button>
            <Button icon={Upload} onClick={() => startUpload()} className="min-h-[44px]">
              {t("dash.uploadCta")}
            </Button>
          </>
        }
      />
      {citizenId && (
        <Badge tone="primary" className="-mt-3">
          <Hash className="h-3 w-3" aria-hidden="true" />
          {t("dash.memberId", { id: citizenId })}
        </Badge>
      )}

      <HomeInsightCards onNavigate={onNavigate} />

      <UploadHero onFile={startUpload} />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2" padding="p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-2 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-ink dark:text-slate-100">{t("dash.recent.title")}</h2>
              <button
                type="button"
                onClick={() => onNavigate("my-documents")}
                className="inline-flex min-h-[44px] items-center px-1 text-xs font-semibold text-primary hover:text-primary-dark dark:text-primary-100"
              >
                {t("common.viewAll")}
              </button>
            </div>
            {isLoading ? (
              <div className="p-5 text-sm text-ink-soft">{t("common.loading")}</div>
            ) : recent.length === 0 ? (
              <EmptyState
                illustration={NoDocumentsIllustration}
                title={t("dash.recent.emptyTitle")}
                description={t("dash.recent.emptyBody")}
              />
            ) : (
              <ul className="divide-y divide-line dark:divide-slate-800">
                {recent.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(doc)}
                      className="flex min-h-[60px] w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink dark:text-slate-100">{doc.title}</span>
                        <span className="block text-xs text-ink-soft">
                          {t("dash.recent.submitted", { date: formatDateTime(new Date(doc.upload_date)) })}
                        </span>
                      </span>
                      <StatusBadge status={doc.lifecycle_status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink dark:text-slate-100">{t("dash.track.title")}</h2>
            <p className="mt-2 text-sm text-ink-soft">{t("dash.track.body")}</p>
            {stats.awaiting_review > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                {tn("dash.track.awaiting", stats.awaiting_review)}
              </p>
            )}
          </Card>
        </section>
      )}

      <section aria-labelledby="mine-heading">
        <h2 id="mine-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-soft">
          {t("dash.overview.mine")}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {isLoading ? cards.map((c) => <StatCardSkeleton key={c.key} />) : cards.map(({ key, ...card }) => <StatCard key={key} {...card} />)}
        </div>
      </section>

      <UploadModal
        isOpen={isUploadOpen}
        initialFile={uploadFile}
        onClose={() => {
          setIsUploadOpen(false);
          setUploadFile(null);
        }}
        onUploaded={(doc) => {
          load();
          setSelected(doc);
        }}
      />
      <CitizenDocumentModal isOpen={Boolean(selected)} onClose={() => setSelected(null)} document={selected} />
    </div>
  );
}
