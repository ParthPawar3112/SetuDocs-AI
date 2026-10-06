import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "../../hooks/useI18n";

// Show / hide password. 44px square so it is easy to hit on a phone.
export default function PasswordToggle({ visible, onToggle }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
      aria-pressed={visible}
      className="grid h-11 w-11 place-items-center rounded-lg text-ink-soft transition hover:text-primary"
    >
      {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
    </button>
  );
}
