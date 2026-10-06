// Stopwatch for the "manual vs SetuDocs" retrieval test: time how long it takes
// to find a document each way, then save the run as a trial. Trials are real
// measurements the person made - the Impact screen only switches from
// "assumed" to "measured" times once enough of them exist.
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Play, RotateCcw, Save, Square, Timer } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { createTrialRequest } from "../../api/impact";
import { describeError } from "../../hooks/useApiData";
import { useI18n } from "../../hooks/useI18n";
import { useToast } from "../../hooks/useToast";
import { FIELD_CLASS, secondsText } from "../../utils/setu";

const METHODS = ["manual", "setudocs"];
const MAX_SECONDS = 3600;

export default function StopwatchCard({ onSaved }) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [method, setMethod] = useState("manual");
  const [note, setNote] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const startedAt = useRef(0);
  const baseMs = useRef(0);

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = setInterval(() => setElapsedMs(baseMs.current + (performance.now() - startedAt.current)), 100);
    return () => clearInterval(id);
  }, [isRunning]);

  const start = () => {
    setError("");
    startedAt.current = performance.now();
    baseMs.current = elapsedMs;
    setIsRunning(true);
  };
  const stop = () => {
    setElapsedMs(baseMs.current + (performance.now() - startedAt.current));
    setIsRunning(false);
  };
  const reset = () => {
    setIsRunning(false);
    setElapsedMs(0);
    baseMs.current = 0;
    setError("");
  };

  const seconds = Math.round(elapsedMs / 100) / 10;
  const canSave = !isRunning && seconds > 0;
  const locked = isRunning || elapsedMs > 0;

  const save = async () => {
    if (seconds > MAX_SECONDS) {
      setError(t("impact.watch.tooLong"));
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await createTrialRequest({ method, seconds, note: note.trim() || null });
      showToast(t("impact.watch.saved", { time: secondsText(seconds, t), method: t(`impact.trials.${method}`) }), "success");
      reset();
      setNote("");
      onSaved();
    } catch (requestError) {
      setError(describeError(requestError, t("impact.watch.saveError")));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-ink dark:text-slate-100">{t("impact.watch.title")}</h2>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{t("impact.watch.body")}</p>

      <fieldset className="mt-4">
        <legend className="sr-only">{t("impact.watch.legend")}</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {METHODS.map((value) => (
            <label
              key={value}
              className={clsx(
                "flex min-h-[44px] cursor-pointer flex-col justify-center rounded-lg border px-3 py-2 transition",
                method === value
                  ? "border-primary bg-primary-50 dark:bg-primary/10"
                  : "border-line hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800",
                locked && "cursor-not-allowed opacity-60"
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
                <input
                  type="radio"
                  name="trial-method"
                  value={value}
                  checked={method === value}
                  onChange={() => setMethod(value)}
                  disabled={locked}
                  className="h-4 w-4 accent-primary"
                />
                {t(`impact.watch.${value}`)}
              </span>
              <span className="pl-6 text-xs text-ink-soft">{t(`impact.watch.${value}Hint`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p
        role="timer"
        aria-label={t("impact.watch.elapsed")}
        className="my-5 text-center text-5xl font-bold tabular-nums tracking-tight text-ink dark:text-slate-100"
      >
        {(elapsedMs / 1000).toFixed(1)}
        <span className="ml-1 text-lg font-semibold text-ink-soft">{t("unit.s")}</span>
      </p>

      <div className="grid grid-cols-2 gap-2">
        {isRunning ? (
          <Button variant="danger" icon={Square} onClick={stop} className="min-h-[44px]">
            {t("impact.watch.stop")}
          </Button>
        ) : (
          <Button icon={Play} onClick={start} className="min-h-[44px]">
            {elapsedMs > 0 ? t("impact.watch.resume") : t("impact.watch.start")}
          </Button>
        )}
        <Button variant="secondary" icon={RotateCcw} onClick={reset} disabled={elapsedMs === 0} className="min-h-[44px]">
          {t("impact.watch.reset")}
        </Button>
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">{t("impact.watch.note")}</span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          placeholder={t("impact.watch.notePlaceholder")}
          className={FIELD_CLASS}
        />
      </label>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Button icon={Save} onClick={save} disabled={!canSave} loading={isSaving} className="mt-4 min-h-[44px] w-full">
        {t("impact.watch.save")}
        {canSave ? ` (${secondsText(seconds, t)})` : ""}
      </Button>
    </Card>
  );
}
