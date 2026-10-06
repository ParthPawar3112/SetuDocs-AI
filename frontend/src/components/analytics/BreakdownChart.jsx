// Reusable ranked-magnitude horizontal bar chart (Departments/Categories) -
// one hue, since these bars encode "how many" per label, not distinct
// identities that need separating colors. Direct value labels at each
// bar-end double as the data table for screen readers/zoom.
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { useDarkMode } from "../../hooks/useDarkMode";
import { CHART_COLORS, PRIMARY_HUE, barCursor, tooltipLabelStyle, tooltipStyle } from "./ChartTheme";
import { NoDataIllustration } from "../illustrations/EmptyIllustrations";
import { useI18n } from "../../hooks/useI18n";

export default function BreakdownChart({ title, subtitle, data, emptyTitle, emptyBody }) {
  const { t } = useI18n();
  const { isDark } = useDarkMode();
  const theme = CHART_COLORS[isDark ? "dark" : "light"];
  const rows = (data || []).slice(0, 8);

  return (
    <Card>
      <h3 className="text-sm font-semibold text-ink dark:text-slate-100">{title}</h3>
      {subtitle && <p className="text-xs text-ink-soft">{subtitle}</p>}
      <div className="mt-4 h-64">
        {rows.length === 0 ? (
          <EmptyState illustration={NoDataIllustration} title={emptyTitle ?? t("chart.emptyTitle")} description={emptyBody ?? t("chart.emptyBody")} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="breakdownFill" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={PRIMARY_HUE} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={PRIMARY_HUE} stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: theme.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip contentStyle={tooltipStyle(theme)} labelStyle={tooltipLabelStyle} cursor={barCursor(isDark)} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={20}>
                {rows.map((entry) => (
                  <Cell key={entry.label} fill="url(#breakdownFill)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
