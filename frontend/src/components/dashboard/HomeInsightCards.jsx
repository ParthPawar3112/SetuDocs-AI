// The three cards a business owner wants first: what is due soon, which schemes
// they may qualify for, and how much time SetuDocs has saved. Each reads the same
// endpoint as its full screen, links to it, and handles its own loading / error /
// empty state so one failing request never blanks the dashboard.
import { ArrowRight, CalendarCheck, CalendarClock, Hourglass, Landmark } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import ProgressBar from "../ui/ProgressBar";
import { Skeleton } from "../ui/Skeleton";
import ErrorState from "../ui/ErrorState";
import BasisLabel from "../impact/BasisLabel";
import { listDeadlinesRequest } from "../../api/deadlines";
import { getImpactRequest } from "../../api/impact";
import { getSchemeMatchesRequest } from "../../api/schemes";
import { useApiData } from "../../hooks/useApiData";
import { useI18n } from "../../hooks/useI18n";
import { URGENCY, daysText, formatDueDate, minutesText } from "../../utils/setu";

const fetchOpenDeadlines = () => listDeadlinesRequest("open");
const PROFILE_FIELDS = ["entity_type", "business_stage", "sector", "state", "gender", "social_category"];

function CardHeader({ icon: Icon, title, linkLabel, onOpen, tone = "primary" }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-ink dark:text-slate-100">
        <span
          className={
            tone === "success"
              ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-green-50 text-success dark:bg-green-500/15"
              : tone === "warning"
                ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-warning dark:bg-amber-500/15"
                : "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary dark:bg-primary/15"
          }
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="truncate">{title}</span>
      </h2>
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${t("dash.openSection")}: ${linkLabel}`}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg px-1 text-xs font-semibold text-primary hover:text-primary-dark dark:text-primary-100"
        >
          {t("dash.openSection")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function ListSkeleton({ rows = 3 }) {
  return (
    <div className="mt-3 space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  );
}

function DueSoonCard({ onNavigate }) {
  const { t, tn, locale } = useI18n();
  const { data, isLoading, error, reload } = useApiData(fetchOpenDeadlines, t("dash.dueSoon.loadError"));
  // The API returns open deadlines soonest-first, so the first three are the next three.
  const next = (data?.items ?? []).slice(0, 3);

  return (
    <Card className="flex flex-col">
      <CardHeader icon={CalendarClock} tone="warning" title={t("dash.dueSoon.title")} linkLabel={t("nav.deadlines")} onOpen={() => onNavigate("deadlines")} />
      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <div className="mt-3">
          <ErrorState title={t("dash.dueSoon.loadError")} message={error} onRetry={reload} />
        </div>
      ) : next.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-3 text-sm font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
          <CalendarCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          {t("dash.dueSoon.allClear")}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {next.map((deadline) => {
            const look = URGENCY[deadline.urgency] ?? URGENCY.upcoming;
            return (
              <li key={deadline.id}>
                <button
                  type="button"
                  onClick={() => onNavigate("deadlines")}
                  className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink dark:text-slate-100">{deadline.label}</span>
                    <span className="block text-xs text-ink-soft">{formatDueDate(deadline.due_date, locale)}</span>
                  </span>
                  <Badge tone={look.tone} className="shrink-0">
                    {daysText(deadline.days_left, t, tn)}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function SchemesCard({ onNavigate }) {
  const { t } = useI18n();
  const { data, isLoading, error, reload } = useApiData(getSchemeMatchesRequest, t("dash.schemes.loadError"));
  const top = (data?.schemes ?? []).slice(0, 3);
  const profileBlank = data && !PROFILE_FIELDS.some((key) => data.profile[key]);

  return (
    <Card className="flex flex-col">
      <CardHeader icon={Landmark} tone="success" title={t("dash.schemes.title")} linkLabel={t("nav.schemes")} onOpen={() => onNavigate("schemes")} />
      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <div className="mt-3">
          <ErrorState title={t("dash.schemes.loadError")} message={error} onRetry={reload} />
        </div>
      ) : (
        <>
          {profileBlank && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              {t("dash.schemes.fillProfile")}
            </p>
          )}
          {top.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">{t("dash.schemes.none")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {top.map((scheme) => (
                <li key={scheme.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate("schemes")}
                    className="block min-h-[56px] w-full rounded-xl border border-line px-3 py-2.5 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-ink dark:text-slate-100">{scheme.name}</span>
                      <Badge tone={scheme.match === "likely" ? "success" : "warning"} className="shrink-0">
                        {scheme.match === "likely" ? t("dash.match.likely") : t("dash.match.possible")}
                      </Badge>
                    </span>
                    <span className="mt-2 block">
                      <ProgressBar percent={scheme.readiness_percent} />
                    </span>
                    <span className="mt-1 block text-xs text-ink-soft">
                      {t("dash.schemes.readiness", { percent: scheme.readiness_percent })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

function TimeSavedCard({ onNavigate }) {
  const { t, tn } = useI18n();
  const { data, isLoading, error, reload } = useApiData(getImpactRequest, t("dash.time.loadError"));

  return (
    <Card className="flex flex-col">
      <CardHeader icon={Hourglass} title={t("dash.time.title")} linkLabel={t("nav.impact")} onOpen={() => onNavigate("impact")} />
      {isLoading ? (
        <ListSkeleton rows={2} />
      ) : error ? (
        <div className="mt-3">
          <ErrorState title={t("dash.time.loadError")} message={error} onRetry={reload} />
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-4xl font-extrabold tabular-nums tracking-tight text-ink dark:text-slate-100">
            {minutesText(data.time.minutes_saved_estimate, t)}
          </p>
          <div className="mt-2">
            <BasisLabel basis={data.time.basis} />
          </div>
          <p className="mt-3 text-sm text-ink-soft">{tn("dash.time.docs", data.documents.digitised)}</p>
        </div>
      )}
    </Card>
  );
}

export default function HomeInsightCards({ onNavigate }) {
  const { t } = useI18n();
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label={`${t("dash.dueSoon.title")}, ${t("dash.schemes.title")}, ${t("dash.time.title")}`}>
      <DueSoonCard onNavigate={onNavigate} />
      <SchemesCard onNavigate={onNavigate} />
      <TimeSavedCard onNavigate={onNavigate} />
    </section>
  );
}
