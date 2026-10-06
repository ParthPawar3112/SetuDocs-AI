// Staff dashboard (Admin / CA-CSC operator). Leads with what matters to the
// people the workspace serves - due dates, schemes, time saved, then a place to
// drop new paperwork - and keeps the generic workspace numbers lower down.
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, FileText, Upload, XCircle } from "lucide-react";
import StatCard from "./StatCard";
import { StatCardSkeleton } from "../ui/Skeleton";
import PageHeader from "../ui/PageHeader";
import Button from "../ui/Button";
import ErrorState from "../ui/ErrorState";
import HomeInsightCards from "./HomeInsightCards";
import UploadHero from "./UploadHero";
import RecentDocuments from "./RecentDocuments";
import ActivityTimeline from "./ActivityTimeline";
import PendingApprovals from "./PendingApprovals";
import QuickActions from "./QuickActions";
import SystemStatus from "./SystemStatus";
import UploadModal from "../documents/UploadModal";
import { useSourceDocument } from "../setu/SourceDocumentViewer";
import { getDocumentStatsRequest, listDocumentsRequest } from "../../api/documents";
import { describeError } from "../../hooks/useApiData";
import { useI18n } from "../../hooks/useI18n";

const emptyStats = { total: 0, uploaded_today: 0, pending: 0, approved: 0, rejected: 0 };

export function greetingKey(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "dash.greeting.morning";
  if (hour < 17) return "dash.greeting.afternoon";
  return "dash.greeting.evening";
}

export default function DashboardHome({ user, sessionStartedAt, onNavigate }) {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState(emptyStats);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { openDocument, viewer } = useSourceDocument();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [statsRes, recentRes, pendingRes] = await Promise.all([
        getDocumentStatsRequest(),
        listDocumentsRequest({ limit: 5 }),
        listDocumentsRequest({ status: "Pending", limit: 5 }),
      ]);
      setStats(statsRes.data);
      setRecentDocuments(recentRes.data.items);
      setPendingDocuments(pendingRes.data.items);
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

  const statCards = [
    { key: "total", label: t("dash.stat.total"), value: stats.total, icon: FileText, tone: "primary" },
    { key: "pending", label: t("dash.stat.pending"), value: stats.pending, icon: Clock, tone: "warning" },
    { key: "approved", label: t("dash.stat.approved"), value: stats.approved, icon: CheckCircle2, tone: "success" },
    { key: "rejected", label: t("dash.stat.rejected"), value: stats.rejected, icon: XCircle, tone: "danger" },
  ];
  const name = user.full_name || user.username;
  const today = new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={today}
        title={t(greetingKey(), { name })}
        description={t("dash.subtitleStaff")}
        actions={
          <Button icon={Upload} onClick={() => startUpload()} className="min-h-[44px]">
            {t("dash.uploadCta")}
          </Button>
        }
      />

      <HomeInsightCards onNavigate={onNavigate} />

      <UploadHero onFile={startUpload} />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <RecentDocuments documents={recentDocuments} isLoading={isLoading} onNavigate={onNavigate} onUpload={() => startUpload()} />
            <PendingApprovals documents={pendingDocuments} isLoading={isLoading} onNavigate={onNavigate} />
          </div>
          <div className="space-y-6">
            <ActivityTimeline username={user.username} sessionStartedAt={sessionStartedAt} />
            <QuickActions role={user.role} onNavigate={onNavigate} />
            <SystemStatus />
          </div>
        </section>
      )}

      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-soft">
          {t("dash.overview.title")}
        </h2>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {isLoading
            ? statCards.map((stat) => <StatCardSkeleton key={stat.key} />)
            : statCards.map(({ key, ...card }) => <StatCard key={key} {...card} />)}
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
          openDocument(doc.id);
        }}
      />
      {viewer}
    </div>
  );
}
