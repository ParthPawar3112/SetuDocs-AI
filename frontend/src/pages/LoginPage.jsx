// Public sign-in / sign-up page. The auth calls are unchanged from the original
// (login(), register()); this file is presentation: brand hero with an animated
// product preview on the left, the form card on the right.
import { useState } from "react";
import { BellRing, Landmark, ScanText, ShieldCheck } from "lucide-react";
import LoginForm from "../components/auth/LoginForm";
import SignupForm from "../components/auth/SignupForm";
import ProductPreview from "../components/illustrations/ProductPreview";
import Logo from "../components/Logo";
import LanguageToggle from "../components/ui/LanguageToggle";
import { useAuth } from "../hooks/useAuth";
import { useDarkMode } from "../hooks/useDarkMode";
import { useI18n } from "../hooks/useI18n";

const FEATURES = [
  { key: "auth.feature.languages", icon: ScanText },
  { key: "auth.feature.deadlines", icon: BellRing },
  { key: "auth.feature.schemes", icon: Landmark },
  { key: "auth.feature.private", icon: ShieldCheck },
];

// Original small badges - deliberately not the UN's own SDG icons or wheel.
const SDGS = [8, 9, 16];

function SdgRow({ onDark }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className={onDark ? "text-[11px] font-medium text-white/60" : "text-[11px] font-medium text-ink-soft"}>
        {t("auth.sdg.label")}
      </p>
      <ul className="flex flex-wrap gap-2">
        {SDGS.map((goal) => (
          <li
            key={goal}
            className={
              onDark
                ? "flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-3 text-[11px] font-medium text-white/85 ring-1 ring-white/15"
                : "flex items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-1 pr-3 text-[11px] font-medium text-ink-soft ring-1 ring-primary/10 dark:bg-primary/10"
            }
          >
            <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-white px-1 text-[10px] font-extrabold text-primary-dark">
              {goal}
            </span>
            {t(`auth.sdg.${goal}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LoginPage() {
  const { login, register } = useAuth();
  const { t } = useI18n();
  // This page renders before DashboardLayout mounts, so apply the saved theme here too.
  useDarkMode();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError("");
  };

  const handleLogin = async (credentials) => {
    setError("");
    setIsSubmitting(true);
    try {
      await login(credentials);
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(typeof detail === "string" ? detail : t("auth.error.signIn"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (payload) => {
    setError("");
    setIsSubmitting(true);
    try {
      await register(payload);
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(typeof detail === "string" ? detail : t("auth.error.register"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <main className="grid min-h-screen lg:h-screen lg:grid-cols-[1.45fr_1fr]">
      {/* LEFT - brand hero (desktop) */}
      <section
        aria-label={t("app.name")}
        className="relative hidden flex-col overflow-y-auto overflow-x-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-dark p-8 text-white lg:flex xl:px-12 xl:py-9"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-primary-100/10 blur-3xl" />

        <div className="relative flex flex-1 flex-col justify-center gap-5 py-2">
          <div className="flex items-center gap-6">
            <Logo variant="seal" tone="reversed" size={150} />
            <div className="min-w-0">
              <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-[3.4rem]">
                {t("auth.hero.title")}
              </h1>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/75">{t("auth.hero.subtitle")}</p>
            </div>
          </div>
          <ProductPreview />
        </div>

        <div className="relative space-y-4">
          <ul className="grid grid-cols-2 gap-3 border-t border-white/10 pt-5 xl:grid-cols-4">
            {FEATURES.map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-center gap-2.5 text-[13px] font-medium text-white/85">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
          <SdgRow onDark />
        </div>
      </section>

      {/* RIGHT - authentication card */}
      <section className="relative flex flex-col items-center overflow-x-hidden bg-app dark:bg-slate-950 lg:overflow-y-auto">
        {/* compact brand band for phones and tablets */}
        <div className="w-full bg-gradient-to-br from-primary-dark via-primary to-primary-dark px-5 pb-8 pt-5 text-white lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Logo variant="mark" tone="reversed" size={40} withText />
            <LanguageToggle />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{t("auth.hero.title")}</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/75">{t("auth.hero.subtitle")}</p>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-100/35 blur-3xl dark:bg-primary/[0.07] lg:block" />

        <div className="relative flex w-full max-w-[460px] flex-1 flex-col justify-center px-5 py-6 lg:py-10">
          <div className="relative -mt-6 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_-24px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.04] dark:bg-slate-900 dark:ring-white/[0.06] lg:mt-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary-50 to-transparent dark:from-primary/10" />

            <div className="relative px-6 py-8 sm:px-9 sm:py-9">
              <div className="mb-6 hidden items-center justify-between gap-3 lg:flex">
                <Logo variant="mark" size={48} withText />
                <LanguageToggle />
              </div>

              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">
                  {isSignup ? t("signup.title") : t("auth.welcomeBack")}
                </h2>
                <p className="mt-2 text-sm text-ink-soft">
                  {isSignup ? t("signup.subtitle") : t("auth.signinSubtitle")}
                </p>
              </div>

              <div className="mt-7">
                {isSignup ? (
                  <SignupForm
                    onSubmit={handleRegister}
                    isSubmitting={isSubmitting}
                    error={error}
                    onSwitchToLogin={() => switchMode("login")}
                  />
                ) : (
                  <LoginForm
                    onSubmit={handleLogin}
                    isSubmitting={isSubmitting}
                    error={error}
                    onSwitchToSignup={() => switchMode("signup")}
                  />
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-line pt-5 text-xs text-ink-soft dark:border-slate-800">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("auth.secure")}</span>
              </div>
            </div>
          </div>

          {/* feature + SDG strip below the card on small screens */}
          <div className="mt-6 space-y-4 lg:hidden">
            <ul className="grid grid-cols-2 gap-3">
              {FEATURES.map(({ key, icon: Icon }) => (
                <li key={key} className="flex items-center gap-2.5 text-[13px] font-medium text-ink dark:text-slate-200">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary dark:bg-primary/15">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {t(key)}
                </li>
              ))}
            </ul>
            <SdgRow />
          </div>
        </div>
      </section>
    </main>
  );
}
