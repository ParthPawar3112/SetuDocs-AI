// Dashboard upload strip: drop a file anywhere in the zone, pick one, or (on a
// phone) take a photo of the paperwork. The file is handed to the upload flow
// (UploadModal), which does the real validation and the API call.
import { useRef, useState } from "react";
import clsx from "clsx";
import { Camera, FolderOpen, UploadCloud } from "lucide-react";
import Button from "../ui/Button";
import { MAX_UPLOAD_SIZE_MB } from "../../config/departments";
import { useI18n } from "../../hooks/useI18n";

export default function UploadHero({ onFile }) {
  const { t } = useI18n();
  const fileInput = useRef(null);
  const cameraInput = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onFile(dropped);
  };

  const handlePicked = (event) => {
    const picked = event.target.files?.[0];
    if (picked) onFile(picked);
    event.target.value = "";
  };

  return (
    <section
      aria-label={t("hero.zoneLabel")}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      className={clsx(
        "relative overflow-hidden rounded-2xl border-2 border-dashed p-5 transition-colors sm:p-6",
        isDragActive
          ? "border-primary bg-primary-50 dark:bg-primary/15"
          : "border-primary/30 bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:border-primary/30 dark:from-primary/10 dark:via-slate-900 dark:to-primary/5"
      )}
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <span
          className={clsx(
            "grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/25 transition-transform",
            isDragActive && "scale-110"
          )}
        >
          <UploadCloud className="h-7 w-7" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight text-ink dark:text-slate-100">
            {isDragActive ? t("hero.dropActive") : t("hero.title")}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{t("hero.subtitle")}</p>
          <p className="mt-1 text-xs text-ink-soft">{t("hero.formats", { size: MAX_UPLOAD_SIZE_MB })}</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button icon={FolderOpen} onClick={() => fileInput.current?.click()} className="min-h-[44px]">
            {t("hero.choose")}
          </Button>
          <Button variant="secondary" icon={Camera} onClick={() => cameraInput.current?.click()} className="min-h-[44px] sm:hidden">
            {t("hero.camera")}
          </Button>
        </div>
      </div>

      <input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handlePicked} tabIndex={-1} aria-hidden="true" />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePicked} tabIndex={-1} aria-hidden="true" />
    </section>
  );
}
