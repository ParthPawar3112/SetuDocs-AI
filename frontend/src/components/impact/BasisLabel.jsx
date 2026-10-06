// The honesty label for time figures. The API says whether the numbers come
// from the person's own stopwatch trials ("measured") or from default
// assumptions ("assumed"); an assumed figure must never look like a measurement.
import { FlaskConical, Ruler } from "lucide-react";
import Badge from "../ui/Badge";
import { useI18n } from "../../hooks/useI18n";

export default function BasisLabel({ basis }) {
  const { t } = useI18n();
  if (basis === "measured") {
    return (
      <Badge tone="success">
        <Ruler className="h-3 w-3" aria-hidden="true" />
        {t("basis.measured")}
      </Badge>
    );
  }
  return (
    <Badge tone="warning">
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      {t("basis.assumed")}
    </Badge>
  );
}
