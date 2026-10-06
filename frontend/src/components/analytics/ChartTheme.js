// Shared chart color tokens (Phase 8). Recharts renders SVG, so its axis/grid
// colors need real hex values rather than Tailwind classes - kept in one
// place so every chart in the Analytics section reads consistently in both
// themes. The 5-color STATUS_ORDER passed validate_palette.js (dataviz
// skill) for CVD-safe adjacency in this exact sequence - don't reorder it
// without re-running the validator.
export const CHART_COLORS = {
  light: { grid: "#e2e8f0", axis: "#64748b", tooltipBg: "#ffffff", tooltipBorder: "#e2e8f0" },
  dark: { grid: "#334155", axis: "#94a3b8", tooltipBg: "#0f172a", tooltipBorder: "#334155" },
};

export const PRIMARY_HUE = "#2563EB";

// Order: Approved, Needs Correction, Rejected, Archived, Pending - validated
// as a set (all-pairs CVD + normal-vision + contrast) in this exact sequence.
export const STATUS_ORDER = [
  { key: "approved", label: "Approved", color: "#16A34A" },
  { key: "needs_correction", label: "Needs Correction", color: "#7C3AED" },
  { key: "rejected", label: "Rejected", color: "#DC2626" },
  { key: "archived", label: "Archived", color: "#0D9488" },
  { key: "pending", label: "Pending", color: "#D97706" },
];

// One readable tooltip for every chart: padded card, soft shadow, comfortable text.
export function tooltipStyle(theme) {
  return {
    background: theme.tooltipBg,
    border: `1px solid ${theme.tooltipBorder}`,
    borderRadius: 12,
    fontSize: 13,
    padding: "8px 12px",
    boxShadow: "0 8px 24px -8px rgba(15, 23, 42, 0.25)",
  };
}
export const tooltipLabelStyle = { fontWeight: 600, marginBottom: 2 };
export const barCursor = (isDark) => ({ fill: isDark ? "rgba(148,163,184,0.10)" : "rgba(37,99,235,0.06)", radius: 6 });
