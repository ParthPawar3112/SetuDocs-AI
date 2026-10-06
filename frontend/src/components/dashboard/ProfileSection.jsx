import { useState } from "react";
import { AtSign, BadgeCheck, Calendar, Hash, KeyRound, ShieldCheck, User as UserIcon } from "lucide-react";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import PageHeader from "../ui/PageHeader";
import ChangePasswordModal from "../auth/ChangePasswordModal";
import { useI18n } from "../../hooks/useI18n";
import { formatDateTime } from "../../utils/format";

export default function ProfileSection({ user, onLogout }) {
  const { t } = useI18n();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const isCitizen = Boolean(user.citizen_id);
  // The role value ("Citizen") is API contract; people see a plain-language label.
  const roleLabel = t(`role.${user.role}`);
  const fields = [
    ...(user.full_name ? [{ icon: UserIcon, label: t("profile.fullName"), value: user.full_name }] : []),
    ...(isCitizen ? [{ icon: AtSign, label: t("profile.username"), value: user.username }] : []),
    isCitizen
      ? { icon: BadgeCheck, label: t("profile.memberId"), value: user.citizen_id }
      : { icon: Hash, label: t("profile.userId"), value: `#${user.id}` },
    { icon: ShieldCheck, label: t("profile.role"), value: roleLabel },
    { icon: Calendar, label: t("profile.created"), value: formatDateTime(new Date(user.created_at)) },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow={t("nav.profile")} title={t("profile.title")} />

      <Card>
        <div className="flex items-center gap-4">
          <Avatar username={user.username} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-ink dark:text-slate-100">{user.username}</p>
            <Badge tone="primary" className="mt-1">
              {roleLabel}
            </Badge>
          </div>
        </div>

        <dl className="mt-6 space-y-4 border-t border-line pt-5 dark:border-slate-800">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between gap-4 text-sm">
              <dt className="flex items-center gap-2 text-ink-soft">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </dt>
              <dd className="text-right font-medium text-ink dark:text-slate-100">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 dark:border-slate-800 sm:flex-row">
          <Button variant="secondary" icon={KeyRound} onClick={() => setIsChangePasswordOpen(true)} className="min-h-[44px]">
            {t("profile.changePassword")}
          </Button>
          <Button variant="danger" onClick={onLogout} className="min-h-[44px] sm:ml-auto">
            {t("nav.logout")}
          </Button>
        </div>
      </Card>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onLogout={onLogout}
      />
    </div>
  );
}
