// Application route boundary that exposes the dashboard only to authenticated users.
import { AuthProvider } from "./context/AuthContext";
import Logo from "./components/Logo";
import { useDarkMode } from "./hooks/useDarkMode";
import { useI18n } from "./hooks/useI18n";
import { useAuth } from "./hooks/useAuth";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";

function ProtectedApplication() {
  const { isLoading, user } = useAuth();
  const { t } = useI18n();
  // Apply the saved theme from the very first paint, so the splash screen matches it too.
  useDarkMode();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-app text-ink-soft dark:bg-slate-950" role="status">
        <div className="flex flex-col items-center gap-4">
          <span className="animate-pulseSoft">
            <Logo variant="seal" size={112} />
          </span>
          <p className="text-sm">{t("app.loadingWorkspace")}</p>
        </div>
      </div>
    );
  }

  return user ? <DashboardPage /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApplication />
    </AuthProvider>
  );
}
