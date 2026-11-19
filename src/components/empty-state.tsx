export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="animate-rise flex flex-col items-center px-6 py-14 text-center">
      <svg viewBox="0 0 160 120" className="mb-6 w-44" aria-hidden>
        <ellipse cx="80" cy="104" rx="56" ry="8" fill="currentColor" className="text-primary/10" />
        <rect x="34" y="22" width="92" height="76" rx="16" fill="currentColor" className="text-primary/10" />
        <rect x="46" y="38" width="48" height="8" rx="4" fill="currentColor" className="text-primary/30" />
        <rect x="46" y="54" width="68" height="8" rx="4" fill="currentColor" className="text-primary/20" />
        <rect x="46" y="70" width="36" height="8" rx="4" fill="currentColor" className="text-primary/20" />
        <circle cx="118" cy="30" r="14" fill="var(--gold)" />
        <path d="M112 30l4.5 4.5L125 26" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <h3 className="text-2xl font-extrabold tracking-tight">{title}</h3>
      {text && <p className="mt-2 max-w-xs text-base font-medium text-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
