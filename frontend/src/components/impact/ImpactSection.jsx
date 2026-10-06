// Impact - what SetuDocs has done for this workspace, measured from real
// records. Counts come from GET /api/impact. Time figures are labelled
// "assumed" unless the API says they were measured from 3+ stopwatch trials
// per method, so an estimate never passes for a measurement.
import { useEffect, useState } from "react";
import { CalendarClock, FileCheck2, Gauge, Hourglass, Landmark, ScrollText } from "lucide-react";
import Card from "../ui/Card";
import ErrorState from "../ui/ErrorState";
import PageHeader from "../ui/PageHeader";
import { Skeleton, StatCardSkeleton } from "../ui/Skeleton";
import BreakdownChart from "../analytics/BreakdownChart";
import MetricCard from "./MetricCard";
import BasisLabel from "./BasisLabel";
import ImpactTimelineChart from "./ImpactTimelineChart";
import StopwatchCard from "./StopwatchCard";
import TrialsCard from "./TrialsCard";
import { getImpactRequest, listTrialsRequest } from "../../api/impact";
import { getSchemeMatchesRequest } from "../../api/schemes";
import { useApiData } from "../../hooks/useApiData";
import { useI18n } from "../../hooks/useI18n";
import { minutesText, secondsText } from "../../utils/setu";

function LoadingState() {
  return (
    <div aria-busy="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

export default function ImpactSection() {
  const { t } = useI18n();
  const impact = useApiData(getImpactRequest, t("impact.loadErrorBody"));
  const trials = useApiData(listTrialsRequest, t("impact.trials.loadErrorBody"));
  const [staffSchemes, setStaffSchemes] = useState(null);

  // Impact only reports scheme counts for personal (Citizen) scope. For staff,
  // use the signed-in person's own matches so the card still shows real data.
  const needsSchemeFallback = Boolean(impact.data) && impact.data.schemes == null;
  useEffect(() => {
    if (!needsSchemeFallback) return;
    let active = true;
    getSchemeMatchesRequest()
      .then(({ data }) => {
        if (!active) return;
        setStaffSchemes({
          likely: data.schemes.filter((s) => s.match === "likely").length,
          possible: data.schemes.filter((s) => s.match === "possible").length,
          profile_complete: data.profile.is_complete,
        });
      })
      .catch(() => active && setStaffSchemes(null));
    return () => {
      active = false;
    };
  }, [needsSchemeFallback]);

  const refreshAll = () => {
    impact.reload({ silent: true });
    trials.reload({ silent: true });
  };

  const data = impact.data;
  const schemes = data?.schemes ?? staffSchemes;

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.impact")}
        title={t("impact.title")}
        description={data?.scope === "workspace" ? t("impact.desc.workspace") : t("impact.desc.personal")}
      />

      {impact.isLoading ? (
        <LoadingState />
      ) : impact.error ? (
        <ErrorState title={t("impact.loadError")} message={impact.error} onRetry={impact.reload} />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("impact.headline")}>
            <MetricCard label={t("impact.kpi.digitised")} value={data.documents.digitised} icon={FileCheck2} tone="primary">
              <p>{t("impact.kpi.digitisedNote", { total: data.documents.total, classified: data.documents.classified })}</p>
              {data.documents.avg_pipeline_seconds != null && (
                <p>{t("impact.kpi.avgProcessing", { time: secondsText(data.documents.avg_pipeline_seconds, t) })}</p>
              )}
            </MetricCard>

            <MetricCard label={t("impact.kpi.deadlines")} value={data.deadlines.found_automatically} icon={CalendarClock} tone="warning">
              <p>{t("impact.kpi.deadlinesNote", { tracked: data.deadlines.tracked })}</p>
              <p>{t("impact.kpi.deadlinesNote2", { atRisk: data.deadlines.at_risk, overdue: data.deadlines.overdue })}</p>
            </MetricCard>

            <MetricCard label={t("impact.kpi.schemes")} value={schemes ? schemes.likely : "-"} icon={Landmark} tone="success">
              {schemes ? (
                <>
                  <p>{t("impact.kpi.schemesNote", { possible: schemes.possible })}</p>
                  {!schemes.profile_complete && <p>{t("impact.kpi.schemesProfile")}</p>}
                </>
              ) : (
                <p>{t("impact.kpi.schemesOpen")}</p>
              )}
            </MetricCard>

            <MetricCard label={t("impact.kpi.timeSaved")} value={minutesText(data.time.minutes_saved_estimate, t)} icon={Hourglass} tone="danger">
              <BasisLabel basis={data.time.basis} />
              <p>
                {t("impact.kpi.usingTimes", {
                  manual: secondsText(data.time.manual_seconds_used, t),
                  setu: secondsText(data.time.setudocs_seconds_used, t),
                })}
              </p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="font-semibold text-ink dark:text-slate-200">
                  {data.time.speedup != null ? t("impact.kpi.speedup", { x: data.time.speedup }) : t("impact.kpi.speedupNA")}
                </span>
                <BasisLabel basis={data.time.basis} />
              </p>
            </MetricCard>
          </section>

          <Card className="mt-4 flex items-start gap-3 text-xs text-ink-soft">
            <ScrollText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{t("impact.formula")}</p>
          </Card>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ImpactTimelineChart data={data.timeline} />
            <BreakdownChart
              title={t("impact.chart.typeTitle")}
              subtitle={t("impact.chart.typeSub")}
              data={data.by_type}
            />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <StopwatchCard onSaved={refreshAll} />
            <TrialsCard
              time={data.time}
              scope={data.scope}
              trials={trials.data ?? []}
              isLoading={trials.isLoading}
              error={trials.error}
              onRetry={trials.reload}
              onChanged={refreshAll}
            />
          </section>
        </>
      )}
    </div>
  );
}
