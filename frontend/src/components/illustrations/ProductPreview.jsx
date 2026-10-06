// Animated product-preview card set for the login hero. It shows the real
// flow - scan, read, warn, match - as an illustration, so the numbers and names
// in it are an EXAMPLE and are captioned as one (no live data here).
//
// Motion is CSS-only (staggered entrance, a scan line, a gentle drift). The
// global prefers-reduced-motion rule collapses every animation, which leaves the
// finished layout on screen, and the scan line is hidden for reduced motion.
import clsx from "clsx";
import { BellRing, CalendarClock, FileText, Landmark, ScanLine, Sparkles } from "lucide-react";
import { useI18n } from "../../hooks/useI18n";

function StepBadge({ children, className }) {
  return (
    <span
      className={clsx(
        "absolute -top-3 left-4 z-10 rounded-full bg-primary-dark px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white ring-2 ring-white/30",
        className
      )}
    >
      {children}
    </span>
  );
}

// The cards are always white (they sit on the blue hero), so no dark: variants here.
const bar = "h-2 rounded-full bg-slate-200";

export default function ProductPreview() {
  const { t } = useI18n();

  return (
    <figure className="w-full" aria-label={t("auth.preview.caption")}>
      <div className="relative mx-auto h-[340px] w-full max-w-[470px]">
        {/* 1 - the scanned document */}
        <div
          className="absolute left-0 top-3 w-[56%] animate-fadeUp"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="animate-drift" style={{ animationDuration: "7s" }}>
            <div className="relative -rotate-2 rounded-2xl bg-white p-4 text-ink shadow-glass ring-1 ring-black/5">
              <StepBadge>{t("auth.preview.step.scan")}</StepBadge>
              <div className="mt-1 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="truncate text-xs font-semibold text-ink">{t("auth.preview.docName")}</p>
              </div>
              <div className="relative mt-3 overflow-hidden rounded-xl bg-slate-50 p-3">
                <div className="space-y-2" aria-hidden="true">
                  <div className="h-2.5 w-2/3 rounded-full bg-slate-300" />
                  <div className={clsx(bar, "w-full")} />
                  <div className={clsx(bar, "w-11/12")} />
                  <div className={clsx(bar, "w-4/5")} />
                  <div className="h-2.5 w-1/2 rounded-full bg-slate-300" />
                  <div className={clsx(bar, "w-full")} />
                  <div className={clsx(bar, "w-3/4")} />
                  <div className={clsx(bar, "w-5/6")} />
                </div>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 h-0.5 animate-scan bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_2px_rgba(37,99,235,0.45)] motion-reduce:hidden"
                />
              </div>
              <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                <ScanLine className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {t("auth.feature.languages")}
              </p>
            </div>
          </div>
        </div>

        {/* 2 - what the AI read */}
        <div
          className="absolute right-0 top-[84px] z-10 w-[54%] animate-fadeUp"
          style={{ animationDelay: "0.7s" }}
        >
          <div className="animate-drift" style={{ animationDuration: "8s", animationDelay: "0.8s" }}>
            <div className="relative rotate-1 rounded-2xl bg-white p-4 text-ink shadow-glass ring-1 ring-black/5">
              <StepBadge>{t("auth.preview.step.read")}</StepBadge>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-ink">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {t("auth.preview.fieldsTitle")}
              </p>
              <dl className="mt-3 space-y-2.5 text-xs">
                {[
                  ["auth.preview.type", "auth.preview.typeValue"],
                  ["auth.preview.validTill", "auth.preview.validTillValue"],
                  ["auth.preview.holder", "auth.preview.holderValue"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <dt className="text-slate-600">{t(label)}</dt>
                    <dd className="font-semibold text-ink">{t(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* 3 - deadline warning */}
        <div
          className="absolute bottom-[64px] left-[3%] z-20 animate-chipPop"
          style={{ animationDelay: "1.3s" }}
        >
          <div className="relative flex items-center gap-2.5 rounded-2xl bg-amber-50 py-2.5 pl-3 pr-4 text-amber-900 shadow-glass ring-1 ring-amber-200">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">
                {t("auth.preview.step.warn")}
              </span>
              <span className="block text-[13px] font-bold">{t("auth.preview.deadline", { days: 12 })}</span>
            </span>
            <BellRing className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
        </div>

        {/* 4 - scheme match */}
        <div
          className="absolute bottom-0 right-[1%] z-20 animate-chipPop"
          style={{ animationDelay: "1.9s" }}
        >
          <div className="relative flex items-center gap-2.5 rounded-2xl bg-green-50 py-2.5 pl-3 pr-4 text-green-900 shadow-glass ring-1 ring-green-200">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-green-100 text-green-700">
              <Landmark className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-green-700">
                {t("auth.preview.step.match")}
              </span>
              <span className="block text-[13px] font-bold">{t("auth.preview.scheme")}</span>
            </span>
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-center text-[11px] text-white/75">{t("auth.preview.caption")}</figcaption>
    </figure>
  );
}
