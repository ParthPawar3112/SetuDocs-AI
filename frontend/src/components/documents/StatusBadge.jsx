// Phase 8 - shows the document's full lifecycle status (backend-computed
// `lifecycle_status`, see schemas/document.py::compute_lifecycle_status),
// not just the raw Pending/Approved/Rejected `status` column. Each stage of
// Upload -> OCR -> AI -> Review gets its own color so the table/viewer read
// at a glance.
import Badge from "../ui/Badge";
import { useI18n } from "../../hooks/useI18n";

const TONES = {
  Uploaded: "neutral",
  "OCR Processing": "info",
  "OCR Completed": "primary",
  "OCR Failed": "danger",
  "AI Processing": "purple",
  "AI Failed": "danger",
  "Pending Review": "warning",
  Pending: "warning",
  Approved: "success",
  Rejected: "danger",
  "Needs Correction": "orange",
  Archived: "neutral",
};

export default function StatusBadge({ status }) {
  const { tOr } = useI18n();
  return (
    <Badge tone={TONES[status] ?? "neutral"}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {tOr(`status.${status}`, status)}
    </Badge>
  );
}
