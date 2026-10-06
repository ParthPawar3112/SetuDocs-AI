// Every action navigates to a real section - nothing is a dead click.
import { BarChart3, FileUp, GitBranch, History, Search, Settings as SettingsIcon } from "lucide-react";
import Card from "../ui/Card";
import { useI18n } from "../../hooks/useI18n";

const ACTIONS = [
  { key: "documents", labelKey: "dash.quick.upload", icon: FileUp },
  { key: "search", labelKey: "dash.quick.search", icon: Search },
  // Review Queue is Officer + Admin; Analytics/Audit/Settings stay Admin-only (see navigation.js).
  { key: "workflow", labelKey: "dash.quick.review", icon: GitBranch, staffOnly: true },
  { key: "analytics", labelKey: "dash.quick.analytics", icon: BarChart3, adminOnly: true },
  { key: "audit", labelKey: "dash.quick.audit", icon: History, adminOnly: true },
  { key: "settings", labelKey: "dash.quick.settings", icon: SettingsIcon, adminOnly: true },
];

export default function QuickActions({ role, onNavigate }) {
  const { t } = useI18n();
  const visibleActions = ACTIONS.filter(
    (action) =>
      (!action.adminOnly || role === "Admin") &&
      (!action.staffOnly || role === "Admin" || role === "Officer")
  );

  return (
    <Card>
      <h2 className="text-sm font-semibold text-ink dark:text-slate-100">{t("dash.quick.title")}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
        {visibleActions.map(({ key, labelKey, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className="group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-line p-3 text-center transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary-50 hover:shadow-card-hover dark:border-slate-800 dark:hover:bg-primary/10"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-ink-soft transition-colors group-hover:bg-primary group-hover:text-white dark:bg-slate-800">
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className="text-xs font-medium text-ink dark:text-slate-200">{t(labelKey)}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
