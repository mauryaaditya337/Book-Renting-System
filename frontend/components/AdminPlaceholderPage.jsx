import Link from "next/link";

export function AdminPlaceholderPage({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref = "/admin",
  secondaryLabel = "Back to Overview",
  plannedItems = []
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-[2rem]">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {primaryHref ? (
            <Link href={primaryHref} className="ui-btn-primary">
              {primaryLabel}
            </Link>
          ) : null}
          <Link href={secondaryHref} className="ui-btn-secondary">
            {secondaryLabel}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-700">
            Planned Controls
          </p>
          <div className="mt-4 grid gap-3">
            {plannedItems.map((item) => (
              <div key={item.title} className="rounded-[1.4rem] bg-slate-50 px-4 py-4">
                <p className="text-base font-semibold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-700">
            Section Status
          </p>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">Intentional placeholder</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This section is now part of the shared admin module, with routing, navigation, and a
            consistent workspace shell in place. The management tools themselves can be added here
            next without restructuring the admin area again.
          </p>
          <div className="mt-5 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/90 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ready next</p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              Controls, filters, tables, and moderation actions can plug into this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
