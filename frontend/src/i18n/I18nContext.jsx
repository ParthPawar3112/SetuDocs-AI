// Tiny i18n layer: English (default) and Marathi.
//   const { t, tn, lang, setLang, locale } = useI18n();
//   t("auth.welcomeBack")                      -> string
//   t("dash.greeting", { name })               -> "Hello, {name}" with {name} filled in
//   tOr("status.Approved", "Approved")      -> translated if known, else the fallback
//   tn("deadlines.count", 3)                   -> picks "deadlines.count_one" / "_other", {count} filled in
// The choice is saved in localStorage ("setu_lang"), defaults to English, and is
// mirrored to <html lang="...">. A missing Marathi string falls back to English,
// then to the key itself, so a gap never blanks the screen.
// User documents and AI output are never translated - only interface text.
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import en from "./en";
import mr from "./mr";

export const I18nContext = createContext(null);

const LANG_KEY = "setu_lang";
const DICTIONARIES = { en, mr };
// "-u-nu-latn" keeps Latin digits in Marathi dates, matching the numbers the API returns.
const LOCALES = { en: "en-IN", mr: "mr-IN-u-nu-latn" };

function readStoredLang() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    return stored === "mr" || stored === "en" ? stored : "en";
  } catch {
    return "en";
  }
}

function fill(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* private mode - the choice just won't persist */
    }
  }, [lang]);

  const setLang = useCallback((next) => setLangState(next === "mr" ? "mr" : "en"), []);
  const toggleLang = useCallback(() => setLangState((current) => (current === "en" ? "mr" : "en")), []);

  const t = useCallback(
    (key, vars) => fill(DICTIONARIES[lang][key] ?? DICTIONARIES.en[key] ?? key, vars),
    [lang]
  );

  // Translate if the key exists, otherwise show `fallback` (used for labels that come
  // from the API, e.g. document statuses, where a missing translation must not show a raw key).
  const tOr = useCallback(
    (key, fallback) => DICTIONARIES[lang][key] ?? DICTIONARIES.en[key] ?? fallback,
    [lang]
  );

  const tn = useCallback(
    (key, count, vars) => t(`${key}_${count === 1 ? "one" : "other"}`, { count, ...vars }),
    [t]
  );

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t, tn, tOr, locale: LOCALES[lang] }),
    [lang, setLang, toggleLang, t, tn, tOr]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
