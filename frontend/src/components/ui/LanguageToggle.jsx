// EN / मराठी switch. Two real buttons (not a hidden checkbox) so it works with
// keyboard and screen readers: each announces its language and whether it is
// the current one. `compact` is a single 44px button that flips to the other
// language - used in the phone top bar where there is no room for two.
import clsx from "clsx";
import { Languages } from "lucide-react";
import { useI18n } from "../../hooks/useI18n";

const OPTIONS = [
  { value: "en", label: "EN", name: "English" },
  { value: "mr", label: "मराठी", name: "मराठी" },
];

export default function LanguageToggle({ className, compact = false }) {
  const { lang, setLang, t } = useI18n();

  if (compact) {
    const next = OPTIONS.find((option) => option.value !== lang);
    return (
      <button
        type="button"
        onClick={() => setLang(next.value)}
        lang={next.value}
        aria-label={`${t("lang.change")}: ${next.name}`}
        className={clsx(
          "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-bold text-primary transition hover:bg-primary-50 dark:text-primary-100 dark:hover:bg-slate-800",
          className
        )}
      >
        <Languages className="h-4 w-4" aria-hidden="true" />
        {next.label}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("lang.change")}
      className={clsx(
        "inline-flex items-center gap-0.5 rounded-xl border border-line bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800",
        className
      )}
    >
      <Languages className="ml-2 mr-1 hidden h-4 w-4 text-ink-soft sm:block" aria-hidden="true" />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLang(option.value)}
          aria-pressed={lang === option.value}
          lang={option.value}
          aria-label={option.name}
          className={clsx(
            "min-h-[44px] min-w-[44px] rounded-[10px] px-3 text-sm font-semibold transition",
            lang === option.value
              ? "bg-primary text-white shadow-sm"
              : "text-ink-soft hover:bg-white hover:text-ink dark:text-slate-300 dark:hover:bg-slate-700"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
