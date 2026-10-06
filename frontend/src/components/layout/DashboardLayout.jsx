// Owns the "chrome" state (sidebar collapse, mobile drawer, dark mode) so
// individual sections stay simple: grouped sidebar + top bar on desktop, top bar
// + bottom tab bar + slide-over drawer on phones.
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import BottomTabBar from "./BottomTabBar";
import { useDarkMode } from "../../hooks/useDarkMode";
import { useI18n } from "../../hooks/useI18n";
import { getSection } from "../../config/navigation";

const COLLAPSE_KEY = "govdocs_sidebar_collapsed";

export default function DashboardLayout({
  user,
  onLogout,
  activeSection,
  onSectionChange,
  sessionStartedAt,
  incident,
  onOpenRecovery,
  children,
}) {
  const { t } = useI18n();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "true");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isDark, toggleTheme } = useDarkMode();

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Escape closes the phone drawer.
  useEffect(() => {
    if (!isMobileOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setIsMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMobileOpen]);

  const section = getSection(activeSection);

  return (
    <div className="min-h-screen bg-app dark:bg-slate-950 lg:flex">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((v) => !v)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onLogout={onLogout}
        role={user.role}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopNavbar
          user={user}
          onNavigate={onSectionChange}
          isDark={isDark}
          onToggleDark={toggleTheme}
          sessionStartedAt={sessionStartedAt}
          onLogout={onLogout}
        />

        {incident && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-danger px-4 py-2.5 text-center text-sm font-semibold text-white">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              PRIMARY DATA STORE INCIDENT DETECTED — Recovery mode is active.
            </span>
            {onOpenRecovery && activeSection !== "recovery" && (
              <button
                onClick={onOpenRecovery}
                className="min-h-[44px] rounded-md bg-white/20 px-3 text-xs font-semibold transition hover:bg-white/30"
              >
                Open Recovery Center
              </button>
            )}
          </div>
        )}

        <main key={section.key} className="flex-1 animate-pageIn px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-8">
          {children}
        </main>

        <footer className="hidden border-t border-line px-6 py-4 text-center text-xs text-ink-soft dark:border-slate-800 lg:block">
          {t("app.name")} &middot; {t("app.tagline")} &middot; {t("footer.builtFor")}
        </footer>
      </div>

      <BottomTabBar
        role={user.role}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        onOpenMore={() => setIsMobileOpen(true)}
      />
    </div>
  );
}
