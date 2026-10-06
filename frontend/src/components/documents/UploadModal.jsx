// Handles the full upload flow: drag & drop or browse, client-side
// validation (mirrors backend rules for instant feedback - the backend
// re-validates regardless, since client checks are never trusted alone),
// upload progress, and success/error reporting via toast.
// `initialFile` lets the dashboard drop zone hand a file straight in.
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, Image as ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import ProgressBar from "../ui/ProgressBar";
import {
  AI_OUTPUT_LANGUAGES,
  ALLOWED_UPLOAD_EXTENSIONS,
  DEFAULT_AI_OUTPUT_LANGUAGE,
  DEPARTMENTS,
  MAX_UPLOAD_SIZE_MB,
} from "../../config/departments";
import { uploadDocumentRequest } from "../../api/documents";
import { useI18n } from "../../hooks/useI18n";
import { useToast } from "../../hooks/useToast";
import { FIELD_CLASS, TEXTAREA_CLASS } from "../../utils/setu";

// How long the "uploaded, now processing" confirmation stays up before the
// modal hands off to the document viewer (which takes over with the real
// OCR/AI polling).
const SUCCESS_STAGE_MS = 1400;

const MAX_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

function fileIcon(file) {
  if (!file) return UploadCloud;
  return file.type.startsWith("image/") ? ImageIcon : FileText;
}

function extensionOf(filename) {
  return filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
}

// Source types are API values; only the labels are translated.
const SOURCE_TYPE_VALUES = ["", "official", "departmental", "trusted_external", "user_submitted", "unknown"];

const initialForm = {
  title: "",
  department: DEPARTMENTS[0],
  description: "",
  outputLanguage: DEFAULT_AI_OUTPUT_LANGUAGE,
  // Provenance for the Trust & Verification layer - all optional; anything
  // left blank is shown as "Unknown", never invented.
  sourceType: "",
  sourceReferenceNo: "",
  sourcePublishedDate: "",
  sourceUrl: "",
};

export default function UploadModal({ isOpen, onClose, onUploaded, initialFile = null }) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileError, setFileError] = useState("");
  const [formError, setFormError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("form"); // "form" | "success"
  const successTimeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(successTimeoutRef.current), []);

  const validateFile = (candidate) => {
    const extension = extensionOf(candidate.name);
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
      return t("upload.error.type", { types: ALLOWED_UPLOAD_EXTENSIONS.join(", ").toUpperCase() });
    }
    if (candidate.size > MAX_BYTES) return t("upload.error.size", { size: MAX_UPLOAD_SIZE_MB });
    if (candidate.size === 0) return t("upload.error.empty");
    return null;
  };

  const reset = () => {
    clearTimeout(successTimeoutRef.current);
    setFile(null);
    setForm(initialForm);
    setFileError("");
    setFormError("");
    setProgress(0);
    setIsUploading(false);
    setUploadStage("form");
  };

  const handleClose = () => {
    if (isUploading || uploadStage === "success") return;
    reset();
    onClose();
  };

  const pickFile = (candidate) => {
    const error = validateFile(candidate);
    if (error) {
      setFileError(error);
      setFile(null);
      return;
    }
    setFileError("");
    setFile(candidate);
    setForm((current) => (current.title ? current : { ...current, title: candidate.name.replace(/\.[^.]+$/, "") }));
  };

  // A file handed in from the dashboard drop zone.
  useEffect(() => {
    if (isOpen && initialFile) pickFile(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialFile]);

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) pickFile(dropped);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!file) {
      setFileError(t("upload.chooseFile"));
      return;
    }
    if (!form.title.trim()) {
      setFormError(t("upload.titleRequired"));
      return;
    }

    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("department", form.department);
    formData.append("description", form.description.trim());
    formData.append("output_language", form.outputLanguage);
    if (form.sourceType) formData.append("source_type", form.sourceType);
    if (form.sourceReferenceNo.trim()) formData.append("source_reference_no", form.sourceReferenceNo.trim());
    if (form.sourcePublishedDate.trim()) formData.append("source_published_date", form.sourcePublishedDate.trim());
    if (form.sourceUrl.trim()) formData.append("source_url", form.sourceUrl.trim());
    formData.append("file", file);

    setIsUploading(true);
    try {
      const { data } = await uploadDocumentRequest(formData, (progressEvent) => {
        if (progressEvent.total) {
          setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        }
      });
      showToast(t("upload.toastSuccess", { title: data.title }), "success");
      // Brief confirmation before handing off to the document viewer, which
      // takes over with the real live OCR -> AI status.
      setIsUploading(false);
      setUploadStage("success");
      successTimeoutRef.current = setTimeout(() => {
        onUploaded(data);
        reset();
        onClose();
      }, SUCCESS_STAGE_MS);
      return;
    } catch (error) {
      const detail = error.response?.data?.detail;
      const message = typeof detail === "string" ? detail : t("upload.error.failed");
      setFormError(message);
      showToast(message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const Icon = fileIcon(file);
  const set = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));

  if (uploadStage === "success") {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={t("upload.title")} size="md">
        <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-green-50 text-success dark:bg-green-500/15">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-ink dark:text-slate-100">{t("upload.success")}</p>
          <p className="flex items-center gap-1.5 text-sm text-ink-soft">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("upload.successBody")}
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("upload.title")} size="md">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {!file ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              isDragActive
                ? "border-primary bg-primary-50 dark:bg-primary/10"
                : "border-line hover:border-primary/40 dark:border-slate-700"
            }`}
          >
            <UploadCloud className="h-8 w-8 text-ink-soft" aria-hidden="true" />
            <p className="text-sm font-medium text-ink dark:text-slate-100">{t("upload.dragHere")}</p>
            <p className="text-xs text-ink-soft">{t("upload.or")}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
              className="min-h-[44px]"
            >
              {t("upload.browse")}
            </Button>
            <p className="mt-1 text-xs text-ink-soft">{t("upload.formats", { size: MAX_UPLOAD_SIZE_MB })}</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(event) => {
                const picked = event.target.files?.[0];
                if (picked) pickFile(picked);
                event.target.value = "";
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-line p-4 dark:border-slate-700">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-50 dark:bg-primary/15">
              <Icon className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink dark:text-slate-100">{file.name}</p>
              <p className="text-xs text-ink-soft">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="grid h-11 w-11 place-items-center rounded-lg text-ink-soft hover:bg-slate-100 hover:text-danger dark:hover:bg-slate-800"
                aria-label={t("upload.removeFile")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {fileError && (
          <p role="alert" className="text-sm text-danger">
            {fileError}
          </p>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">{t("upload.titleLabel")}</span>
          <input
            value={form.title}
            onChange={set("title")}
            className={FIELD_CLASS}
            placeholder={t("upload.titlePlaceholder")}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">{t("upload.department")}</span>
          <select value={form.department} onChange={set("department")} className={FIELD_CLASS}>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">{t("upload.aiLanguage")}</span>
          <select value={form.outputLanguage} onChange={set("outputLanguage")} className={FIELD_CLASS}>
            {AI_OUTPUT_LANGUAGES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ink-soft">{t("upload.aiLanguageHelp")}</p>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink dark:text-slate-200">
            {t("upload.description")} <span className="font-normal text-ink-soft">({t("common.optional")})</span>
          </span>
          <textarea
            value={form.description}
            onChange={set("description")}
            rows={3}
            className={TEXTAREA_CLASS}
            placeholder={t("upload.descriptionPlaceholder")}
          />
        </label>

        {/* Provenance for the Trust & Verification layer - all optional. */}
        <details className="rounded-lg border border-line px-3 py-1 dark:border-slate-700">
          <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-medium text-ink dark:text-slate-200">
            <span>
              {t("upload.provenance")} <span className="font-normal text-ink-soft">{t("upload.provenanceHint")}</span>
            </span>
          </summary>
          <div className="mt-2 space-y-3 pb-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-soft">{t("upload.sourceType")}</span>
              <select value={form.sourceType} onChange={set("sourceType")} className={FIELD_CLASS}>
                {SOURCE_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {t(`upload.sourceType.${value || "auto"}`)}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-soft">{t("upload.reference")}</span>
                <input
                  value={form.sourceReferenceNo}
                  onChange={set("sourceReferenceNo")}
                  className={FIELD_CLASS}
                  placeholder={t("upload.referencePlaceholder")}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-soft">{t("upload.published")}</span>
                <input
                  value={form.sourcePublishedDate}
                  onChange={set("sourcePublishedDate")}
                  className={FIELD_CLASS}
                  placeholder={t("upload.publishedPlaceholder")}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-soft">{t("upload.link")}</span>
              <input value={form.sourceUrl} onChange={set("sourceUrl")} className={FIELD_CLASS} placeholder="https://…" />
            </label>
          </div>
        </details>

        {isUploading && (
          <div className="space-y-1.5">
            <ProgressBar percent={progress} />
            <p className="text-right text-xs text-ink-soft">{progress}%</p>
          </div>
        )}

        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isUploading} className="min-h-[44px]">
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={isUploading} className="min-h-[44px]">
            {isUploading ? t("upload.submitting") : t("upload.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
