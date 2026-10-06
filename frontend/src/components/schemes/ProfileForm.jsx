// Business profile form for the Scheme Matcher. The dropdown options come from
// the API (`options`), so the form can never offer a value the backend rejects.
// A blank answer means "unknown" - the matcher never guesses it.
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { useI18n } from "../../hooks/useI18n";
import { FIELD_CLASS, optionText, profileFieldText } from "../../utils/setu";

const SELECT_FIELDS = ["entity_type", "business_stage", "sector", "gender", "social_category"];
const ALL_FIELDS = [...SELECT_FIELDS, "state"];

function toForm(profile) {
  return Object.fromEntries(ALL_FIELDS.map((key) => [key, profile?.[key] ?? ""]));
}

export default function ProfileForm({ profile, options, isSaving, onSave }) {
  const { t, tOr } = useI18n();
  const [form, setForm] = useState(() => toForm(profile));
  useEffect(() => setForm(toForm(profile)), [profile]);

  const isDirty = ALL_FIELDS.some((key) => form[key] !== (profile?.[key] ?? ""));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({ ...form, state: form.state.trim() });
  };

  return (
    <Card>
      <h2 className="text-sm font-semibold text-ink dark:text-slate-100">{t("schemes.profile.title")}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t("schemes.profile.hint")}</p>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SELECT_FIELDS.map((field) => (
            <label key={field} className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">{profileFieldText(field, t)}</span>
              <select
                value={form[field]}
                onChange={(event) => setForm((c) => ({ ...c, [field]: event.target.value }))}
                className={FIELD_CLASS}
              >
                <option value="">{t("schemes.profile.skip")}</option>
                {(options?.[field] ?? []).map((value) => (
                  <option key={value} value={value}>
                    {optionText(value, tOr)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">{profileFieldText("state", t)}</span>
            <input
              value={form.state}
              onChange={(event) => setForm((c) => ({ ...c, state: event.target.value }))}
              maxLength={60}
              placeholder={t("schemes.profile.statePlaceholder")}
              className={FIELD_CLASS}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="submit" icon={Save} loading={isSaving} disabled={!isDirty} className="min-h-[44px] w-full sm:w-auto">
            {t("schemes.profile.save")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
