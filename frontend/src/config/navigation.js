// Single source of truth for the app's sections - the sidebar, the mobile tab
// bar and the dashboard quick actions all read from here so labels, icons and
// grouping never drift apart.
//
// `roles` lists which roles see a section. Admin/Officer (shown in the UI as
// admin / CA-CSC operator) keep the full workspace; the "Citizen" role (shown as
// individual / business owner) gets a smaller self-service set. Backend
// authorization enforces the same split independently - hiding a nav item is
// never the only guard. Role VALUES are API contract and are not renamed.
//
// `labelKey` is the i18n key; `label` is the English fallback used by places that
// have no translation hook (e.g. the access-restricted placeholder).
import {
  BarChart3,
  CalendarClock,
  FileText,
  FileUp,
  FolderOpen,
  GitBranch,
  History,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCircle,
} from "lucide-react";

const ALL_STAFF = ["Admin", "Officer"];
const EVERYONE = ["Admin", "Officer", "Citizen"];

// Display order of the sidebar groups.
export const NAV_GROUPS = ["overview", "documents", "insights", "admin"];

export const NAV_SECTIONS = [
  { key: "dashboard", group: "overview", label: "Dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, live: true, roles: EVERYONE },
  { key: "profile", group: "overview", label: "Profile", labelKey: "nav.profile", icon: UserCircle, live: true, roles: EVERYONE },

  { key: "documents", group: "documents", label: "Documents", labelKey: "nav.documents", icon: FileText, live: true, roles: ALL_STAFF },
  { key: "search", group: "documents", label: "Smart Search", labelKey: "nav.search", icon: Search, live: true, roles: ALL_STAFF },
  // Review: Officers verify and decide on submissions, Admins too.
  { key: "workflow", group: "documents", label: "Review Queue", labelKey: "nav.workflow", icon: GitBranch, live: true, roles: ALL_STAFF },
  // "The Bad Reading" - document trust & verification review.
  { key: "verification", group: "documents", label: "Trust & Verification", labelKey: "nav.verification", icon: ShieldCheck, live: true, roles: ALL_STAFF },
  // Individual / business-owner self-service.
  { key: "my-documents", group: "documents", label: "My Documents", labelKey: "nav.myDocuments", icon: FolderOpen, live: true, roles: ["Citizen"] },
  { key: "upload", group: "documents", label: "Upload Document", labelKey: "nav.upload", icon: FileUp, live: true, roles: ["Citizen"] },

  // SetuDocs: deadlines, scheme matching and measured impact - for every role.
  { key: "deadlines", group: "insights", label: "Deadline Guard", labelKey: "nav.deadlines", icon: CalendarClock, live: true, roles: EVERYONE },
  { key: "schemes", group: "insights", label: "Scheme Matcher", labelKey: "nav.schemes", icon: Landmark, live: true, roles: EVERYONE },
  { key: "impact", group: "insights", label: "Impact", labelKey: "nav.impact", icon: TrendingUp, live: true, roles: EVERYONE },
  { key: "analytics", group: "insights", label: "Analytics", labelKey: "nav.analytics", icon: BarChart3, live: true, roles: ["Admin"] },

  { key: "audit", group: "admin", label: "Audit Logs", labelKey: "nav.audit", icon: History, live: true, roles: ["Admin"] },
  { key: "settings", group: "admin", label: "Settings", labelKey: "nav.settings", icon: Settings, live: true, roles: ["Admin"] },
  // "The Blackout" challenge - disaster recovery / data-resilience console.
  { key: "recovery", group: "admin", label: "Recovery Center", labelKey: "nav.recovery", icon: LifeBuoy, live: true, roles: ["Admin"] },
];

export function getSection(key) {
  return NAV_SECTIONS.find((section) => section.key === key) ?? NAV_SECTIONS[0];
}

export function sectionsForRole(role) {
  return NAV_SECTIONS.filter((section) => section.roles.includes(role));
}

// [{ group: "overview", sections: [...] }, ...] with empty groups dropped.
export function groupedSectionsForRole(role) {
  const visible = sectionsForRole(role);
  return NAV_GROUPS.map((group) => ({ group, sections: visible.filter((s) => s.group === group) })).filter(
    (entry) => entry.sections.length > 0
  );
}

// The four sections shown in the phone tab bar (a fifth "More" tab opens the full menu).
export function mobileTabsForRole(role) {
  const priority =
    role === "Citizen"
      ? ["dashboard", "my-documents", "upload", "deadlines"]
      : ["dashboard", "documents", "deadlines", "schemes"];
  const visible = sectionsForRole(role);
  return priority.map((key) => visible.find((s) => s.key === key)).filter(Boolean);
}
