"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type SizeSystem = "UK" | "EU";

const RANGES: Record<SizeSystem, number[]> = {
  UK: Array.from({ length: 12 }, (_, i) => i + 3), // 3 - 14
  EU: Array.from({ length: 16 }, (_, i) => i + 35), // 35 - 50
};

/** "UK 9.5" / "EU 43" -> parts. Anything else (older free-text entries) returns null. */
export function parseShoeSize(v: string): { system: SizeSystem; size: number } | null {
  const m = /^(UK|EU)\s*(\d{1,2}(?:\.5)?)$/i.exec(v.trim());
  return m ? { system: m[1].toUpperCase() as SizeSystem, size: parseFloat(m[2]) } : null;
}

export function ShoeSizePicker({ value, onChange, defaultSystem }: { value: string; onChange: (v: string) => void; defaultSystem: SizeSystem }) {
  const parsed = parseShoeSize(value);
  const [system, setSystem] = useState<SizeSystem>(parsed?.system ?? defaultSystem);
  const current = parsed && parsed.system === system ? parsed.size : null;
  const whole = current !== null ? Math.floor(current) : null;
  const half = current !== null && current % 1 !== 0;

  const pick = (n: number) => onChange(`${system} ${n}${half ? ".5" : ""}`);
  const toggleHalf = () => {
    if (whole === null) return;
    onChange(`${system} ${whole}${half ? "" : ".5"}`);
  };

  return (
    <div className="space-y-5">
      {/* UK / EU switch */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-line/70 p-1.5" role="tablist" aria-label="Size system">
        {(["UK", "EU"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={system === s}
            onClick={() => {
              if (s === system) return;
              setSystem(s);
              if (parsed) onChange(""); // a UK number means nothing in EU, so make them choose again
            }}
            className={cn("h-14 rounded-xl text-lg font-extrabold transition-all active:scale-[0.97]", system === s ? "bg-card text-primary shadow-soft" : "text-muted")}
          >
            {s} sizes
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
        {RANGES[system].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => pick(n)}
            className={cn(
              "h-14 rounded-2xl border-2 text-xl font-extrabold tabular-nums transition-all active:scale-95",
              whole === n ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-line bg-card",
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={toggleHalf}
        disabled={whole === null}
        className={cn(
          "flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 text-lg font-bold transition-all active:scale-[0.98] disabled:opacity-40",
          half ? "border-gold bg-gold/20 text-ink" : "border-line bg-card",
        )}
      >
        {half ? "Half size ✓" : "+ Half size"}
      </button>

      <div className="rounded-2xl bg-card p-4 text-center shadow-soft">
        <p className="text-sm font-bold uppercase tracking-wider text-muted">Selected</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight text-primary">{value.trim() || "–"}</p>
      </div>

      {value.trim() && !parsed && (
        <div>
          <p className="mb-2 text-sm font-semibold text-muted">Typed earlier as free text - tap a size above to replace it.</p>
          <Input value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
    </div>
  );
}
