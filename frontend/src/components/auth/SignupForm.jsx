// Sign-up form (creates a "Citizen" role account - shown to people as an
// individual / business owner; the role value itself is unchanged). Same visual
// language and onSubmit/isSubmitting/error contract as LoginForm. Client-side
// checks are for instant feedback only - the backend re-validates and owns the
// duplicate-username / mismatch responses.
import { useState } from "react";
import { AlertCircle, IdCard, Lock, User } from "lucide-react";
import Button from "../ui/Button";
import AuthField from "./AuthField";
import PasswordToggle from "./PasswordToggle";
import { useI18n } from "../../hooks/useI18n";

export default function SignupForm({ onSubmit, isSubmitting, error, onSwitchToLogin }) {
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const submit = (event) => {
    event.preventDefault();
    const errors = {};
    if (!fullName.trim()) errors.fullName = t("signup.error.namesRequired");
    if (!username.trim()) errors.username = t("signup.error.namesRequired");
    else if (username.trim().length < 3) errors.username = t("signup.error.usernameShort");
    if (password.length < 8) errors.password = t("signup.error.passwordShort");
    else if (password !== confirmPassword) errors.confirm = t("signup.error.mismatch");
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    onSubmit({
      full_name: fullName.trim(),
      username: username.trim(),
      password,
      confirm_password: confirmPassword,
    });
  };

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <AuthField
        label={t("signup.fullName")}
        icon={IdCard}
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        autoComplete="name"
        placeholder={t("signup.fullNamePlaceholder")}
        error={fieldErrors.fullName}
        required
      />
      <AuthField
        label={t("auth.username")}
        icon={User}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username"
        placeholder={t("signup.usernamePlaceholder")}
        error={fieldErrors.username}
        required
      />
      <AuthField
        label={t("auth.password")}
        icon={Lock}
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password"
        placeholder={t("signup.passwordPlaceholder")}
        error={fieldErrors.password}
        trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
        required
      />
      <AuthField
        label={t("signup.confirm")}
        icon={Lock}
        type={showPassword ? "text" : "password"}
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        autoComplete="new-password"
        placeholder={t("signup.confirmPlaceholder")}
        error={fieldErrors.confirm}
        required
      />

      {error && (
        <div
          className="flex animate-fadeIn items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-900/50"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full !h-[54px] !rounded-xl !bg-gradient-to-r !from-primary !to-primary-dark !text-base !shadow-lg !shadow-primary/25 transition-transform hover:!-translate-y-0.5 hover:!shadow-xl"
        size="lg"
        loading={isSubmitting}
      >
        {isSubmitting ? t("signup.creating") : t("signup.submit")}
      </Button>

      <p className="text-center text-sm text-ink-soft">
        {t("signup.haveAccount")}{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="inline-flex min-h-[44px] items-center font-semibold text-primary hover:text-primary-dark"
        >
          {t("signup.signInLink")}
        </button>
      </p>
    </form>
  );
}
