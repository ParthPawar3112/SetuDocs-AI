// Upload landing for an individual / business owner. The upload itself reuses
// the shared UploadModal (it posts to /api/documents/upload, which every
// authenticated role may call) - this screen adds the "why" and an honest
// explanation of what happens next.
import { useState } from "react";
import { ArrowRight, ScanLine, Sparkles, Upload, UserCheck } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import PageHeader from "../ui/PageHeader";
import UploadHero from "../dashboard/UploadHero";
import UploadModal from "../documents/UploadModal";
import CitizenDocumentModal from "./CitizenDocumentModal";
import { ALLOWED_UPLOAD_EXTENSIONS, MAX_UPLOAD_SIZE_MB } from "../../config/departments";
import { useI18n } from "../../hooks/useI18n";

const STEPS = [
  { icon: Upload, key: "upload" },
  { icon: ScanLine, key: "read" },
  { icon: Sparkles, key: "ai" },
  { icon: UserCheck, key: "review" },
];

export default function CitizenUploadSection() {
  const { t } = useI18n();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadedDoc, setUploadedDoc] = useState(null);

  const startUpload = (file = null) => {
    setUploadFile(file);
    setIsUploadOpen(true);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={t("citizenUpload.title")}
        title={t("citizenUpload.heading")}
        description={t("citizenUpload.body")}
        actions={
          <Button icon={Upload} onClick={() => startUpload()} className="min-h-[44px]">
            {t("dash.uploadCta")}
          </Button>
        }
      />
      <p className="-mt-4 mb-6 text-xs text-ink-soft">
        {t("citizenUpload.accepted", { types: ALLOWED_UPLOAD_EXTENSIONS.join(", ").toUpperCase(), size: MAX_UPLOAD_SIZE_MB })}
      </p>

      <UploadHero onFile={startUpload} />

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-ink dark:text-slate-100">{t("citizenUpload.stepsTitle")}</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, key }, index) => (
            <li key={key} className="relative rounded-xl border border-line p-3 dark:border-slate-800">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-50 text-primary dark:bg-primary/15">
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                {index + 1}. {t(`citizenUpload.step.${key}`)}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">{t(`citizenUpload.step.${key}.note`)}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 text-xs text-ink-soft">
          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t("citizenUpload.afterReview")}
        </p>
        <p className="mt-2 text-xs text-ink-soft">{t("citizenUpload.notOfficial")}</p>
      </Card>

      <UploadModal
        isOpen={isUploadOpen}
        initialFile={uploadFile}
        onClose={() => {
          setIsUploadOpen(false);
          setUploadFile(null);
        }}
        onUploaded={(doc) => setUploadedDoc(doc)}
      />

      <CitizenDocumentModal isOpen={Boolean(uploadedDoc)} onClose={() => setUploadedDoc(null)} document={uploadedDoc} />
    </div>
  );
}
