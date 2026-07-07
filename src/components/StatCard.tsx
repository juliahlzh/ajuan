import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  href,
  active = false
}: {
  label: string;
  value: string;
  note?: string;
  icon: LucideIcon;
  href?: string;
  active?: boolean;
}) {
  const content = (
    <div className={`metric-card transition ${active ? 'ring-2 ring-[color:var(--brand)] ring-offset-2 ring-offset-white' : 'hover:-translate-y-0.5 hover:shadow-lg'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="metric-label">{label}</p>
          <p className="metric-value mt-2">{value}</p>
          {note ? <p className="mt-2 text-xs font-semibold text-[color:var(--muted)]">{note}</p> : null}
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
          <Icon size={22} />
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-2 rounded-[30px]">
        {content}
      </Link>
    );
  }

  return (
    <div>
      {content}
    </div>
  );
}
