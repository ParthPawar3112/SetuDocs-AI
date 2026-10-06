// Documents added per day, from the `timeline` array of GET /api/impact.
// Same chart theme as the Analytics charts (ChartTheme tokens, one hue).
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { NoDataIllustration } from "../illustrations/EmptyIllustrations";
import { useDarkMode } from "../../hooks/useDarkMode";
import { useI18n } from "../../hooks/useI18n";
import { CHART_COLORS, PRIMARY_HUE, barCursor, tooltipLabelStyle, tooltipStyle } from "../analytics/ChartTheme";
import { parseIsoDate } from "../../utils/setu";

export default function ImpactTimelineChart({ data }) {
  const { t, locale } = useI18n();
  const { isDark } = useDarkMode();
  const theme = CHART_COLORS[isDark ? "dark" : "light"];
  const rows = data ?? [];
  const hasData = rows.some((row) => row.documents > 0);
  const dayLabel = (value) => parseIsoDate(value).toLocaleDateString(locale, { month: "short", day: "numeric" });

  return (
    <Card>
      <h3 className="text-sm font-semibold text-ink dark:text-slate-100">{t("impact.chart.timelineTitle")}</h3>
      <p className="text-xs text-ink-soft">{t("impact.chart.timelineSub", { days: rows.length })}</p>
      <div className="mt-4 h-64">
        {!hasData ? (
          <EmptyState
            illustration={NoDataIllustration}
            title={t("impact.chart.timelineEmpty")}
            description={t("impact.chart.timelineEmptyBody")}
            className="py-2"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="impactBarFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY_HUE} stopOpacity={1} />
                  <stop offset="100%" stopColor={PRIMARY_HUE} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dayLabel}
                tick={{ fill: theme.axis, fontSize: 11 }}
                axisLine={{ stroke: theme.grid }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis allowDecimals={false} tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={tooltipStyle(theme)}
                labelStyle={tooltipLabelStyle}
                cursor={barCursor(isDark)}
                labelFormatter={dayLabel}
                formatter={(value) => [value, t("impact.chart.tooltip")]}
              />
              <Bar dataKey="documents" fill="url(#impactBarFill)" radius={[8, 8, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
