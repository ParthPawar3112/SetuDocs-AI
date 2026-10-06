// One scheme match. Every line is rendered from the API record: the match
// level, the reasons, which documents the person already has versus still
// needs, and the readiness percentage (shown as a ring).
import { Check, ChevronDown, CircleHelp, ExternalLink, ListChecks, Plus } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import ReadinessRing from "./ReadinessRing";
import { useI18n } from "../../hooks/useI18n";
import { profileFieldText } from "../../utils/setu";
import { translateReason } from "../../utils/schemeReasons";

function DocChip({ doc }) {
  const { t } = useI18n();
  return (
    <li
      className={
        doc.have
          ? "inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 ring-1 ring-green-200 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/30"
          : "inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-400 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-500 dark:text-slate-300"
      }
    >
      {doc.have ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
      <span className="sr-only">{doc.have ? t("schemes.card.have") : t("schemes.card.lack")}</span>
      {doc.label}
      {doc.have && doc.matched_type && doc.matched_type !== doc.label && (
        <span className="font-normal">({doc.matched_type})</span>
      )}
    </li>
  );
}

export default function SchemeCard({ scheme }) {
  const { t, tOr } = useI18n();
  const isLikely = scheme.match === "likely";
  const missingFields = scheme.missing_profile_fields ?? [];

  return (
    <Card className="flex flex-col">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={isLikely ? "success" : "warning"}>{isLikely ? t("schemes.card.likely") : t("schemes.card.possible")}</Badge>
            <Badge tone="neutral">{scheme.category}</Badge>
            {scheme.already_done && <Badge tone="info">{t("schemes.card.alreadyDone")}</Badge>}
          </div>
          <h3 className="mt-2 text-lg font-bold leading-snug text-ink dark:text-slate-100">{scheme.name}</h3>
          <p className="text-xs text-ink-soft">
            {scheme.full_name} &middot; {scheme.agency}
          </p>
        </div>
        <ReadinessRing percent={scheme.readiness_percent} label={t("schemes.card.readinessAria", { name: scheme.name })} />
      </div>

      <div className="mt-4 space-y-2.5 text-sm">
        <p>
          <span className="font-semibold text-ink dark:text-slate-100">{t("schemes.card.offers")} </span>
          <span className="text-ink-soft">{scheme.benefit}</span>
        </p>
        <p>
          <span className="font-semibold text-ink dark:text-slate-100">{t("schemes.card.forWho")} </span>
          <span className="text-ink-soft">{scheme.who_for}</span>
        </p>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("schemes.card.why")}</h4>
        {scheme.reasons?.length ? (
          <ul className="mt-2 space-y-1.5">
            {scheme.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-sm text-ink dark:text-slate-200">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                {translateReason(reason, { t, tOr })}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">{t("schemes.card.whyNone")}</p>
        )}
      </div>

      {missingFields.length > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
          <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t("schemes.card.missingFields", { fields: missingFields.map((f) => profileFieldText(f, t)).join(", ") })}</span>
        </p>
      )}

      {scheme.boosts?.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {scheme.boosts.map((boost) => (
            <li key={boost} className="rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary-dark dark:bg-primary/10 dark:text-primary-100">
              {boost}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("schemes.card.required")}</h4>
        <ul className="mt-2 flex flex-wrap gap-2">
          {scheme.required_docs.map((doc) => (
            <DocChip key={doc.label} doc={doc} />
          ))}
        </ul>

        {scheme.helpful_docs?.length > 0 && (
          <>
            <h4 className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-soft">{t("schemes.card.helpful")}</h4>
            <ul className="mt-2 flex flex-wrap gap-2">
              {scheme.helpful_docs.map((doc) => (
                <DocChip key={doc.label} doc={doc} />
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-1 border-t border-line pt-3 dark:border-slate-800">
        {scheme.apply_steps?.length > 0 && (
          <details className="group">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark dark:text-primary-100">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              {t("schemes.card.howTo")}
              <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <ol className="mb-2 mt-1 list-decimal space-y-1.5 pl-9 pr-1 text-sm text-ink-soft">
              {scheme.apply_steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </details>
        )}
        <a
          href={scheme.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark dark:text-primary-100"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {t("schemes.card.portal")}
          <span className="sr-only">{t("schemes.card.newTab")}</span>
        </a>
        {scheme.source && <p className="break-words text-xs text-ink-soft">{t("schemes.card.source", { source: scheme.source })}</p>}
      </div>
    </Card>
  );
}
