// Real notification data for the top-bar bell: how many of the person's open
// deadlines are overdue or due within 7 days, read from GET /api/deadlines.
// Refreshes every 5 minutes. Failures are silent - the bell just shows nothing new.
import { useEffect, useState } from "react";
import { listDeadlinesRequest } from "../api/deadlines";

const REFRESH_MS = 5 * 60 * 1000;

export function useDeadlineAlerts() {
  const [alerts, setAlerts] = useState({ overdue: 0, critical: 0 });

  useEffect(() => {
    let active = true;
    const load = () =>
      listDeadlinesRequest("open")
        .then(({ data }) => active && setAlerts({ overdue: data.summary.overdue, critical: data.summary.critical }))
        .catch(() => {});
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return alerts;
}
