// Phone navigation: four key sections plus "More", which opens the full drawer.
// Every tab is at least 56px tall. Hidden from the lg breakpoint up, where the
// sidebar takes over.
import clsx from "clsx";
import { Menu } from "lucide-react";
import { mobileTabsForRole } from "../../config/navigation";
import { useI18n } from "../../hooks/useI18n";

export default function BottomTabBar({ role, activeSection, onSectionChange, onOpenMore }) {
  const { t } = useI18n();
  const tabs = mobileTabsForRole(role);

  const tabClass = (active) =>
    clsx(
      "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold transition-colors",
      active ? "text-primary dark:text-primary-100" : "text-ink-soft hover:text-ink dark:text-slate-400 dark:hover:text-slate-100"
    );

  return (
    <nav
      aria-label={t("nav.tabs")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
    >
      <ul className="flex">
        {tabs.map(({ key, labelKey, icon: Icon }) => {
          const isActive = activeSection === key;
          return (
            <li key={key} className="flex flex-1">
              <a
                href={`#${key}`}
                onClick={(event) => {
                  event.preventDefault();
                  onSectionChange(key);
                }}
                aria-current={isActive ? "page" : undefined}
                className={tabClass(isActive)}
              >
                <span
                  className={clsx(
                    "grid h-7 w-12 place-items-center rounded-full transition-colors",
                    isActive && "bg-primary-50 dark:bg-primary/20"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="max-w-full truncate">{t(labelKey)}</span>
              </a>
            </li>
          );
        })}
        <li className="flex flex-1">
          <button type="button" onClick={onOpenMore} aria-haspopup="dialog" className={tabClass(false)}>
            <span className="grid h-7 w-12 place-items-center">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>{t("nav.more")}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
