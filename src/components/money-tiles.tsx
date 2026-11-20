import { cn } from "@/lib/utils";
import { money } from "@/lib/format";

/**
 * Price / deposit / balance as stacked rows, so even "£1,250.50" fits at any screen width
 * (three side-by-side tiles cut the amounts off on a phone).
 */
export function MoneyTiles({
  price,
  deposit,
  method,
  balance,
  onCard,
  className,
}: {
  price: number;
  deposit: number;
  method?: string | null;
  balance: number;
  /** true when shown inside a white card (rows go grey); false on the grey page (rows go white). */
  onCard?: boolean;
  className?: string;
}) {
  const paid = balance <= 0;
  const rowBg = onCard ? "bg-background" : "bg-card shadow-soft";
  return (
    <div className={cn("space-y-2", className)}>
      <Row label="Price" value={money(price)} bg={rowBg} />
      <Row label="Deposit" note={method} value={money(deposit)} bg={rowBg} />
      <div className={cn("flex items-center justify-between gap-3 rounded-2xl px-4 py-4", paid ? "bg-emerald-100 text-emerald-800" : "bg-primary text-primary-foreground")}>
        <span className="text-sm font-extrabold uppercase tracking-wide opacity-80">{paid ? "Paid in full" : "Balance due"}</span>
        <span className="text-4xl font-extrabold leading-none tabular-nums">{money(balance)}</span>
      </div>
    </div>
  );
}

function Row({ label, note, value, bg }: { label: string; note?: string | null; value: string; bg: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 rounded-2xl px-4 py-3", bg)}>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold uppercase tracking-wide text-muted">{label}</span>
        {note && <span className="block truncate text-xs font-bold text-muted">{note}</span>}
      </span>
      <span className="text-2xl font-extrabold tabular-nums">{value}</span>
    </div>
  );
}
