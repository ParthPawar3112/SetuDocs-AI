// Sticky top bar: logo (phones), global search, language toggle, notifications,
// dark mode and the account menu. The bell is driven by real data - overdue and
// soon-due deadlines from the Deadline Guard - and only shows its dot when there
// is something to act on.
import { useCallback, useRef, useState } from "react";
import { Bell, CalendarClock, Moon, Search, Sun } from "lucide-react";
import clsx from "clsx";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Logo from "../Logo";
import LanguageToggle from "../ui/LanguageToggle";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useDeadlineAlerts } from "../../hooks/useDeadlineAlerts";
import { useI18n } from "../../hooks/useI18n";
import { formatRelativeTime } from "../../utils/format";
import { setSearchSeed } from "../../utils/searchSeed";

const ICON_BUTTON =
  "relative grid h-11 w-11 place-items-center rounded-lg text-ink-soft transition hover:bg-slate-100 hover:text-ink dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100";

export default function TopNavbar({
  user,
  onNavigate,
  isDark,
  onToggleDark,
  sessionStartedAt,
  onLogout,
}) {
  const { t, tn } = useI18n();
  const isStaff = user.role === "Admin" || user.role === "Officer";
  const [searchValue, setSearchValue] = useState("");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const alerts = useDeadlineAlerts();
  const alertCount = alerts.overdue + alerts.critical;

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const closeNotif = useCallback(() => setIsNotifOpen(false), []);
  const closeProfile = useCallback(() => setIsProfileOpen(false), []);
  useClickOutside(notifRef, closeNotif, isNotifOpen);
  useClickOutside(profileRef, closeProfile, isProfileOpen);

  const closeOnEscape = (event) => {
    if (event.key === "Escape") {
      setIsNotifOpen(false);
      setIsProfileOpen(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (searchValue.trim()) setSearchSeed(searchValue.trim());
    setSearchValue("");
    onNavigate("search");
  };

  const roleLabel = t(`role.${user.role}`);

  return (
    <header
      className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-1 border-b border-line bg-white/85 px-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85 sm:gap-2 sm:px-6"
      onKeyDown={closeOnEscape}
    >
      <a
        href="#dashboard"
        onClick={(event) => {
          event.preventDefault();
          onNavigate("dashboard");
        }}
        aria-label={t("nav.dashboard")}
        className="grid h-11 w-11 place-items-center rounded-lg lg:hidden"
      >
        <Logo variant="mark" size={32} />
      </a>

      {isStaff && (
        <form onSubmit={handleSearchSubmit} role="search" className="hidden max-w-sm flex-1 sm:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t("topbar.search")}
              aria-label={t("topbar.searchLabel")}
              className="h-10 w-full rounded-lg border border-line bg-slate-50 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
            />
          </div>
        </form>
      )}

      <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
        {/* phones: icon button to the search page / the person's own documents */}
        <button
          type="button"
          onClick={() => onNavigate(isStaff ? "search" : "my-documents")}
          className={clsx(ICON_BUTTON, isStaff && "sm:hidden", !isStaff && "")}
          aria-label={isStaff ? t("topbar.searchLabel") : t("topbar.findDocument")}
        >
          <Search className="h-[18px] w-[18px]" />
        </button>

        <LanguageToggle compact className="sm:hidden" />
        <LanguageToggle className="hidden sm:inline-flex" />

        <button onClick={onToggleDark} className={ICON_BUTTON} aria-label={t("theme.toggle")}>
          {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen((open) => !open)}
            className={ICON_BUTTON}
            aria-label={`${t("topbar.notifications")}${alertCount ? ` (${alertCount})` : ""}`}
            aria-expanded={isNotifOpen}
            aria-haspopup="true"
          >
            <Bell className="h-[18px] w-[18px]" />
            {alertCount > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-danger ring-2 ring-white dark:ring-slate-900" aria-hidden="true" />
            )}
          </button>
          {isNotifOpen && (
            <div className="fixed inset-x-3 top-[68px] z-30 animate-scaleIn rounded-xl border border-line bg-white p-2 shadow-glass dark:border-slate-800 dark:bg-slate-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:origin-top-right">
              <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("topbar.notifications")}
              </p>
              {alerts.overdue > 0 && (
                <p className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium text-red-700 dark:text-red-300">
                  <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {tn("topbar.overdue", alerts.overdue)}
                </p>
              )}
              {alerts.critical > 0 && (
                <p className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium text-orange-700 dark:text-orange-300">
                  <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {tn("topbar.critical", alerts.critical)}
                </p>
              )}
              {alertCount === 0 && (
                <p className="rounded-lg px-2 py-2.5 text-sm text-ink-soft">{t("topbar.noNotifications")}</p>
              )}
              {alertCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate("deadlines");
                    setIsNotifOpen(false);
                  }}
                  className="mt-1 flex min-h-[44px] w-full items-center rounded-lg px-2 text-left text-sm font-semibold text-primary hover:bg-primary-50 dark:text-primary-100 dark:hover:bg-slate-800"
                >
                  {t("topbar.openDeadlines")}
                </button>
              )}
              <div className="mt-1 border-t border-line px-2 py-2 dark:border-slate-800">
                <p className="text-xs text-ink-soft">
                  {t("topbar.signedIn")} · {formatRelativeTime(sessionStartedAt)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen((open) => !open)}
            className="flex min-h-[44px] items-center gap-2 rounded-lg px-1 transition hover:bg-slate-100 dark:hover:bg-slate-800 sm:pr-2"
            aria-label={t("topbar.userMenu")}
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
          >
            <Avatar username={user.username} size="sm" />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-semibold text-ink dark:text-slate-100">{user.username}</span>
              <span className="block text-xs text-ink-soft">
                {user.role === "Citizen" ? t("role.Citizen.short") : roleLabel}
              </span>
            </span>
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 animate-scaleIn origin-top-right rounded-xl border border-line bg-white p-2 shadow-glass dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3 px-2 py-2">
                <Avatar username={user.username} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink dark:text-slate-100">{user.username}</p>
                  <Badge tone="primary" className="mt-0.5">
                    {roleLabel}
                  </Badge>
                </div>
              </div>
              <div className="my-1.5 h-px bg-line dark:bg-slate-800" />
              <button
                onClick={() => {
                  onNavigate("profile");
                  setIsProfileOpen(false);
                }}
                className="min-h-[44px] w-full rounded-lg px-2 text-left text-sm text-ink hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t("topbar.viewProfile")}
              </button>
              <button
                onClick={onLogout}
                className="min-h-[44px] w-full rounded-lg px-2 text-left text-sm text-danger hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                {t("topbar.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
