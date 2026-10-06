// Presentation helpers shared by the SetuDocs screens. Pure formatting - every
// number shown on screen comes from the API.

// "YYYY-MM-DD" -> Date at local midnight. new Date("2026-12-31") would parse as
// UTC and can render as the previous day west of UTC, so build it by hand.
export function parseIsoDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Timestamps from the API are UTC; SQLite hands them back without a "Z", which
// the browser would read as local time. Add it when it is missing.
export function parseServerDate(value) {
  const text = String(value);
  return new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text}Z`);
}

export function formatDueDate(value, locale = "en-IN") {
  return parseIsoDate(value).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export function daysLabel(daysLeft) {
  if (daysLeft < -1) return `${Math.abs(daysLeft)} days overdue`;
  if (daysLeft === -1) return "1 day overdue";
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  return `${daysLeft} days left`;
}

// Buckets come straight from the API (`urgency`); this only maps them to a look.
export const URGENCY = {
  overdue: {
    dot: "bg-red-500",
    label: "Overdue",
    hint: "Past the due date",
    tone: "danger",
    stripe: "border-l-red-500 dark:border-l-red-500",
    tile: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300",
  },
  critical: {
    dot: "bg-orange-500",
    label: "Critical",
    hint: "Due in 0-7 days",
    tone: "orange",
    stripe: "border-l-orange-500 dark:border-l-orange-500",
    tile: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-500/10 dark:text-orange-300",
  },
  soon: {
    dot: "bg-amber-500",
    label: "Soon",
    hint: "Due in 8-30 days",
    tone: "warning",
    stripe: "border-l-amber-500 dark:border-l-amber-500",
    tile: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300",
  },
  upcoming: {
    dot: "bg-primary",
    label: "Upcoming",
    hint: "More than 30 days away",
    tone: "primary",
    stripe: "border-l-primary dark:border-l-primary",
    tile: "border-blue-200 bg-primary-50 text-primary dark:border-blue-900/60 dark:bg-primary/10 dark:text-primary-100",
  },
  done: {
    dot: "bg-green-500",
    label: "Done",
    hint: "Marked as completed",
    tone: "success",
    stripe: "border-l-green-500 dark:border-l-green-500",
    tile: "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-500/10 dark:text-green-300",
  },
};
export const URGENCY_ORDER = ["overdue", "critical", "soon", "upcoming", "done"];

export const KIND_LABELS = { expiry: "Expiry", renewal: "Renewal", due: "Payment / filing", other: "Other" };

// "micro_enterprise" -> "Micro enterprise"; sc/st/obc stay upper-case.
export function optionLabel(value) {
  if (!value) return "";
  if (["sc", "st", "obc"].includes(value)) return value.toUpperCase();
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const PROFILE_FIELD_LABELS = {
  entity_type: "Entity type",
  business_stage: "Business stage",
  sector: "Sector",
  state: "State",
  gender: "Gender",
  social_category: "Social category",
};

export function formatSeconds(seconds) {
  if (seconds == null) return "-";
  if (seconds < 60) return `${Number(seconds).toFixed(seconds < 10 ? 1 : 0)} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

export function formatMinutes(minutes) {
  if (minutes == null) return "-";
  if (minutes < 60) return `${Number(minutes).toFixed(minutes % 1 ? 1 : 0)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

// Shared form-control look (44px tall for touch).
export const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
export const TEXTAREA_CLASS =
  "w-full resize-none rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
export const ICON_BUTTON_CLASS =
  "grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft transition hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100";


// ---- translated helpers ------------------------------------------------------
// The functions above are English-only and kept for older callers; these take the
// i18n functions from useI18n() so every label follows the chosen language.

export function daysText(daysLeft, t, tn) {
  if (daysLeft < -1) return tn("days.overdue", Math.abs(daysLeft));
  if (daysLeft === -1) return tn("days.overdue", 1);
  if (daysLeft === 0) return t("days.today");
  if (daysLeft === 1) return t("days.tomorrow");
  return tn("days.left", daysLeft);
}

export const urgencyText = (key, t) => ({ label: t(`urgency.${key}`), hint: t(`urgency.${key}.hint`) });
export const kindText = (kind, t) => t(`kind.${kind}`);
export const profileFieldText = (field, t) => t(`profile.field.${field}`);
export const optionText = (value, tOr) => tOr(`opt.${value}`, optionLabel(value));

export function secondsText(seconds, t) {
  if (seconds == null) return "-";
  if (seconds < 60) return `${Number(seconds).toFixed(seconds < 10 ? 1 : 0)} ${t("unit.s")}`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest ? `${minutes} ${t("unit.min")} ${rest} ${t("unit.s")}` : `${minutes} ${t("unit.min")}`;
}

export function minutesText(minutes, t) {
  if (minutes == null) return "-";
  if (minutes < 60) return `${Number(minutes).toFixed(minutes % 1 ? 1 : 0)} ${t("unit.min")}`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} ${t("unit.h")} ${rest} ${t("unit.min")}` : `${hours} ${t("unit.h")}`;
}
