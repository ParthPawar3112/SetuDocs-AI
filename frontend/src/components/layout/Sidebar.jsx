// Primary navigation, grouped (Overview / Documents / Insights / Admin).
// Desktop: persistent, collapses to icons. Phone: slide-over drawer opened from
// the top bar or the tab bar's "More" tab (see BottomTabBar).
import clsx from "clsx";
import { ChevronsLeft, ChevronsRight, LogOut, X } from "lucide-react";
import { groupedSectionsForRole } from "../../config/navigation";
import Logo from "../Logo";
import { useI18n } from "../../hooks/useI18n";

export default function Sidebar({
  activeSection,
  onSectionChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onLogout,
  role,
}) {
  const { t } = useI18n();

  const handleSelect = (key) => {
    onSectionChange(key);
    onCloseMobile();
  };

  // Role-scoped nav - see config/navigation.js. Backend RBAC enforces the same
  // boundaries regardless of what is rendered here.
  const groups = groupedSectionsForRole(role);

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        aria-label={t("nav.primary")}
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-primary-dark text-white transition-all duration-300 ease-out lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:shrink-0 lg:translate-x-0",
          isCollapsed ? "lg:w-[76px]" : "lg:w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div className={clsx("flex items-center overflow-hidden", isCollapsed && "lg:hidden")}>
            <Logo variant="mark" tone="reversed" size={36} withText />
          </div>
          {isCollapsed && (
            <div className="hidden lg:block">
              <Logo variant="mark" tone="reversed" size={36} />
            </div>
          )}
          <button
            className="grid h-11 w-11 place-items-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onCloseMobile}
            aria-label={t("common.closeMenu")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3" aria-label={t("nav.primary")}>
          {groups.map(({ group, sections }, index) => (
            <div key={group} className={clsx(index > 0 && "mt-4")}>
              <p
                className={clsx(
                  "px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-200/80",
                  isCollapsed && "lg:hidden"
                )}
              >
                {t(`nav.group.${group}`)}
              </p>
              {isCollapsed && index > 0 && <div className="mx-3 mb-2 hidden h-px bg-white/10 lg:block" />}
              <ul className="space-y-0.5">
                {sections.map(({ key, labelKey, icon: Icon }) => {
                  const isActive = activeSection === key;
                  const label = t(labelKey);
                  return (
                    <li key={key}>
                      {/* Real anchor with a hash href so "open in new tab" works; a plain
                          left-click is handled as an in-app switch (DashboardPage reads the hash). */}
                      <a
                        href={`#${key}`}
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
                          event.preventDefault();
                          handleSelect(key);
                        }}
                        title={isCollapsed ? label : undefined}
                        aria-current={isActive ? "page" : undefined}
                        className={clsx(
                          "group relative flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium no-underline transition-all duration-150",
                          isCollapsed && "lg:justify-center",
                          isActive
                            ? "bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
                            : "text-blue-50/85 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white" aria-hidden="true" />
                        )}
                        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden="true" />
                        <span className={clsx("truncate", isCollapsed && "lg:sr-only")}>{label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <button
            onClick={onLogout}
            title={isCollapsed ? t("nav.logout") : undefined}
            className={clsx(
              "flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-blue-50/85 transition hover:bg-white/10 hover:text-white",
              isCollapsed && "lg:justify-center"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className={clsx(isCollapsed && "lg:sr-only")}>{t("nav.logout")}</span>
          </button>

          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? t("nav.expand") : t("nav.collapse")}
            aria-expanded={!isCollapsed}
            aria-controls="app-sidebar"
            className="hidden min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium text-blue-100/75 transition hover:bg-white/10 hover:text-white lg:flex"
          >
            {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            {!isCollapsed && t("nav.collapse")}
          </button>
        </div>
      </aside>
    </>
  );
}
