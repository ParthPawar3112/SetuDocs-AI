import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { useI18n } from "../../hooks/useI18n";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  isLoading = false,
}) {
  const { t } = useI18n();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 dark:bg-red-500/15">
          <AlertTriangle className="h-5 w-5 text-danger" />
        </span>
        <p className="pt-1.5 text-sm text-ink-soft">{description}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} className="min-h-[44px]">
          {t("states.confirm.cancel")}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={isLoading} className="min-h-[44px]">
          {confirmLabel ?? t("states.confirm.confirm")}
        </Button>
      </div>
    </Modal>
  );
}
