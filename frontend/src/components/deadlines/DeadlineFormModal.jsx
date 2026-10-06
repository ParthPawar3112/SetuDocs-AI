// Add a manual deadline, or edit label / date / notes of an existing one.
// Duplicate manual reminders come back as 409 from the API; that message is
// shown inline so the person knows exactly why it was refused.
import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { createDeadlineRequest, updateDeadlineRequest } from "../../api/deadlines";
import { describeError } from "../../hooks/useApiData";
import { useI18n } from "../../hooks/useI18n";
import { useToast } from "../../hooks/useToast";
import { FIELD_CLASS, TEXTAREA_CLASS, kindText } from "../../utils/setu";

const EMPTY = { label: "", due_date: "", kind: "other", notes: "" };
const KINDS = ["expiry", "renewal", "due", "other"];

export default function DeadlineFormModal({ isOpen, onClose, deadline, onSaved }) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const isEdit = Boolean(deadline);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setForm(
      deadline
        ? { label: deadline.label, due_date: deadline.due_date, kind: deadline.kind, notes: deadline.notes || "" }
        : EMPTY
    );
  }, [isOpen, deadline]);

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const label = form.label.trim();
    if (label.length < 2) {
      setError(t("deadlines.form.nameShort"));
      return;
    }
    if (!form.due_date) {
      setError(t("deadlines.form.dateMissing"));
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      if (isEdit) {
        const changes = {};
        if (label !== deadline.label) changes.label = label;
        if (form.due_date !== deadline.due_date) changes.due_date = form.due_date;
        if ((form.notes || "") !== (deadline.notes || "")) changes.notes = form.notes.trim() || null;
        if (Object.keys(changes).length) await updateDeadlineRequest(deadline.id, changes);
        showToast(t("deadlines.toast.updated"), "success");
      } else {
        await createDeadlineRequest({
          label,
          due_date: form.due_date,
          kind: form.kind,
          notes: form.notes.trim() || null,
        });
        showToast(t("deadlines.toast.added"), "success");
      }
      onSaved();
      onClose();
    } catch (requestError) {
      setError(describeError(requestError, t("deadlines.form.error")));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? t("deadlines.form.editTitle") : t("deadlines.form.addTitle")} size="md">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">{t("deadlines.form.name")}</span>
          <input
            value={form.label}
            onChange={set("label")}
            maxLength={200}
            placeholder={t("deadlines.form.namePlaceholder")}
            className={FIELD_CLASS}
            autoFocus
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">{t("deadlines.form.dueDate")}</span>
            <input type="date" value={form.due_date} onChange={set("due_date")} className={FIELD_CLASS} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">{t("deadlines.form.type")}</span>
            <select value={form.kind} onChange={set("kind")} disabled={isEdit} className={`${FIELD_CLASS} disabled:opacity-60`}>
              {KINDS.map((value) => (
                <option key={value} value={value}>
                  {kindText(value, t)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">{t("deadlines.form.notes")}</span>
          <textarea value={form.notes} onChange={set("notes")} rows={3} maxLength={1000} className={TEXTAREA_CLASS} />
        </label>

        {isEdit && deadline.source !== "manual" && (
          <p className="rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary dark:bg-primary/10 dark:text-primary-100">
            {t("deadlines.form.machineNote")}
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving} className="min-h-[44px]">
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={isSaving} className="min-h-[44px]">
            {isEdit ? t("deadlines.form.save") : t("deadlines.add")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
