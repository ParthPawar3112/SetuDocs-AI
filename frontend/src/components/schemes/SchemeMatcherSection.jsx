// Scheme Matcher - which government schemes the person may qualify for, why,
// and how ready their documents are. Matching, reasons and readiness are all
// computed by GET /api/schemes/matches; this screen only displays them and
// sends profile changes through PUT /api/schemes/profile.
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Info, UserCog } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import PageHeader from "../ui/PageHeader";
import { Skeleton } from "../ui/Skeleton";
import { NoSchemesIllustration } from "../illustrations/EmptyIllustrations";
import ProfileForm from "./ProfileForm";
import SchemeCard from "./SchemeCard";
import { getSchemeMatchesRequest, updateSchemeProfileRequest } from "../../api/schemes";
import { describeError, useApiData } from "../../hooks/useApiData";
import { useI18n } from "../../hooks/useI18n";
import { useToast } from "../../hooks/useToast";
import { formatDueDate } from "../../utils/setu";

const FILTERS = ["all", "likely", "possible"];
const PROFILE_KEYS = ["entity_type", "business_stage", "sector", "state", "gender", "social_category"];
const isProfileBlank = (profile) => !PROFILE_KEYS.some((key) => profile?.[key]);

function LoadingState() {
  return (
    <div aria-busy="true" className="space-y-4">
      <Skeleton className="h-64 rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-96 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function SchemeMatcherSection() {
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const { data, isLoading, error, reload, setData } = useApiData(getSchemeMatchesRequest, t("schemes.loadErrorBody"));
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const schemes = data?.schemes ?? [];
  const counts = useMemo(
    () => ({
      all: schemes.length,
      likely: schemes.filter((s) => s.match === "likely").length,
      possible: schemes.filter((s) => s.match === "possible").length,
    }),
    [schemes]
  );
  const visible = filter === "all" ? schemes : schemes.filter((s) => s.match === filter);

  const handleSave = async (values) => {
    setIsSaving(true);
    try {
      const { data: refreshed } = await updateSchemeProfileRequest(values);
      setData(refreshed);
      showToast(t("schemes.profile.saved"), "success");
    } catch (requestError) {
      showToast(describeError(requestError, t("schemes.profile.saveError")), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow={t("nav.schemes")} title={t("schemes.heading")} description={t("schemes.desc")} />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title={t("schemes.loadError")} message={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          {isProfileBlank(data.profile) && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300"
            >
              <UserCog className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              {t("dash.schemes.fillProfile")}
            </div>
          )}

          <ProfileForm profile={data.profile} options={data.options} isSaving={isSaving} onSave={handleSave} />

          {/* calm, always-visible note: when the catalog was checked and what it is not */}
          <aside className="flex items-start gap-3 rounded-2xl bg-slate-100 px-4 py-3.5 text-sm dark:bg-slate-800/60">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-ink-soft" aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink dark:text-slate-100">
                {t("schemes.verified", { date: formatDueDate(data.verified_on, locale) })}
              </p>
              <p className="mt-1 text-ink-soft">{data.disclaimer}</p>
              {t("schemes.englishNote") && <p className="mt-1 text-xs text-ink-soft">{t("schemes.englishNote")}</p>}
              <p className="mt-1 text-xs text-ink-soft">
                {t("schemes.analysed", { count: data.documents_analysed })}
                {data.held_types.length > 0 && <>: {data.held_types.map((type) => `${type.label} (${type.count})`).join(", ")}</>}
              </p>
            </div>
          </aside>

          {schemes.length === 0 ? (
            <Card>
              <EmptyState illustration={NoSchemesIllustration} title={t("schemes.emptyTitle")} description={t("schemes.emptyBody")} />
            </Card>
          ) : (
            <>
              <div role="tablist" aria-label={t("schemes.filter.label")} className="flex flex-wrap gap-2">
                {FILTERS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={filter === key}
                    onClick={() => setFilter(key)}
                    className={clsx(
                      "min-h-[44px] rounded-full border px-4 text-sm font-semibold transition",
                      filter === key
                        ? "border-primary bg-primary text-white"
                        : "border-line bg-white text-ink-soft hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    {t(`schemes.filter.${key}`)} <span className="tabular-nums">({counts[key]})</span>
                  </button>
                ))}
              </div>

              {visible.length === 0 ? (
                <Card>
                  <EmptyState
                    illustration={NoSchemesIllustration}
                    title={filter === "likely" ? t("schemes.noLikely") : t("schemes.noPossible")}
                    description={t("schemes.switchFilter")}
                  />
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {visible.map((scheme) => (
                    <SchemeCard key={scheme.id} scheme={scheme} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
