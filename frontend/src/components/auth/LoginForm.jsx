// Credential form. The data contract with LoginPage is unchanged
// (onSubmit({ username, password }), isSubmitting, error, onSwitchToSignup).
// "Remember me" is real - it saves the username in this browser. The old
// "Forgot password?" link only revealed a note (there is no reset flow), so it
// was removed rather than left as a dead control.
import { useEffect, useState } from "react";
import { AlertCircle, Lock, User } from "lucide-react";
import Button from "../ui/Button";
import AuthField from "./AuthField";
import PasswordToggle from "./PasswordToggle";
import { useI18n } from "../../hooks/useI18n";

const REMEMBER_KEY = "govdocs_remembered_username";

export default function LoginForm({ onSubmit, isSubmitting, error, onSwitchToSignup }) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const errors = {};
    if (!username.trim()) errors.username = t("auth.error.usernameRequired");
    if (!password) errors.password = t("auth.error.passwordRequired");
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, username);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    onSubmit({ username, password });
  };

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <AuthField
        label={t("auth.username")}
        icon={User}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username"
        placeholder={t("auth.usernamePlaceholder")}
        error={fieldErrors.username}
        required
      />

      <AuthField
        label={t("auth.password")}
        icon={Lock}
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        placeholder="••••••••"
        error={fieldErrors.password}
        trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
        required
      />

      <label className="flex min-h-[44px] cursor-pointer select-none items-center gap-2.5 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          className="h-5 w-5 rounded border-line text-primary focus:ring-primary/40"
        />
        {t("auth.remember")}
      </label>

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
        {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
      </Button>

      {onSwitchToSignup && (
        <p className="text-center text-sm text-ink-soft">
          {t("auth.newHere")}{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="inline-flex min-h-[44px] items-center font-semibold text-primary hover:text-primary-dark"
          >
            {t("auth.createAccountLink")}
          </button>
        </p>
      )}
    </form>
  );
}
