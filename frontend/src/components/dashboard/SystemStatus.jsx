// The only "status" data in this dashboard that isn't a placeholder - it
// genuinely polls the real Phase 1 /api/health endpoint and reflects whatever
// comes back, including failure.
import { useEffect, useState } from "react";
import { Database, RefreshCw, Server } from "lucide-react";
import clsx from "clsx";
import Card from "../ui/Card";
import client from "../../api/client";
import { useI18n } from "../../hooks/useI18n";

const POLL_INTERVAL_MS = 30_000;

export default function SystemStatus() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState("checking"); // checking | online | offline
  const [dbConnected, setDbConnected] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    try {
      const { data } = await client.get("/health");
      setStatus("online");
      setDbConnected(data.database === "connected");
    } catch {
      setStatus("offline");
      setDbConnected(false);
    } finally {
      setLastChecked(new Date());
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const rows = [
    { label: t("dash.system.api"), icon: Server, ok: status === "online" },
    { label: t("dash.system.db"), icon: Database, ok: dbConnected },
  ];

  return (
    <Card>
      <div className="-my-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink dark:text-slate-100">{t("dash.system.title")}</h2>
        <button
          onClick={checkHealth}
          className="grid h-11 w-11 place-items-center rounded-lg text-ink-soft transition hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800"
          aria-label={t("dash.system.refresh")}
        >
          <RefreshCw className={clsx("h-4 w-4", isRefreshing && "animate-spin")} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map(({ label, icon: Icon, ok }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-ink-soft">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={clsx(
                  "h-2 w-2 rounded-full",
                  status === "checking" ? "animate-pulseSoft bg-slate-400" : ok ? "bg-success" : "bg-danger"
                )}
              />
              <span className={ok ? "text-success" : status === "checking" ? "text-ink-soft" : "text-danger"}>
                {status === "checking" ? t("dash.system.checking") : ok ? t("dash.system.online") : t("dash.system.offline")}
              </span>
            </span>
          </div>
        ))}
      </div>

      {lastChecked && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-soft dark:border-slate-800">
          {t("dash.system.lastChecked", { time: lastChecked.toLocaleTimeString(locale) })}
        </p>
      )}
    </Card>
  );
}
