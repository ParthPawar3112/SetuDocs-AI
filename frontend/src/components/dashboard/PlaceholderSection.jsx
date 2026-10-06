// Shown when someone opens a section their role cannot use (the backend refuses
// those requests too - this is just the friendly face of that).
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import PageHeader from "../ui/PageHeader";
import { useI18n } from "../../hooks/useI18n";

export default function PlaceholderSection({ section }) {
  const { t } = useI18n();
  const label = t(section.labelKey ?? "nav.dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow={label} title={label} />
      <Card padding="p-0">
        <EmptyState
          icon={section.icon}
          title={t("restricted.title", { section: label })}
          description={t("restricted.body")}
        />
      </Card>
    </div>
  );
}
