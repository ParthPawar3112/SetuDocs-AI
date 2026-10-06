// The one page heading used by every screen: eyebrow label, title, a one-line
// description and (optionally) the primary action(s) on the right / below on phones.
export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-100">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
