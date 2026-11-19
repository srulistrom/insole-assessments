"use client";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArchType } from "@/lib/types";
import { money, parseMoney } from "@/lib/format";
import { Field, Input } from "@/components/ui/input";

export interface Terms {
  archId: string | null;
  price: string;
  deposit: string;
  method: string | null;
}

export const EMPTY_TERMS: Terms = { archId: null, price: "0", deposit: "0", method: null };

export function termsBalance(t: Terms) {
  return Math.round((parseMoney(t.price) - parseMoney(t.deposit)) * 100) / 100;
}

export function OrderTerms({
  archTypes,
  methods,
  value,
  onChange,
  allowUndecided,
}: {
  archTypes: ArchType[];
  methods: string[];
  value: Terms;
  onChange: (t: Terms) => void;
  allowUndecided?: boolean;
}) {
  const balance = termsBalance(value);
  const set = (patch: Partial<Terms>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-7">
      <section>
        <h3 className="mb-3 text-[15px] font-bold">Arch type</h3>
        <div className="grid gap-3">
          {archTypes.map((a) => {
            const on = value.archId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => set({ archId: a.id, price: String(a.price) })}
                className={cn(
                  "flex min-h-[72px] items-center gap-4 rounded-2xl border-2 bg-card px-5 text-left transition-all active:scale-[0.98]",
                  on ? "border-primary bg-primary/5 shadow-soft" : "border-line",
                )}
              >
                <span className={cn("grid size-8 place-items-center rounded-full border-2", on ? "border-primary bg-primary text-primary-foreground" : "border-line")}>
                  {on && <Check className="size-5 stroke-[3]" />}
                </span>
                <span className="flex-1 text-xl font-extrabold">{a.name}</span>
                <span className="text-2xl font-extrabold tabular-nums">{money(a.price)}</span>
              </button>
            );
          })}
          {allowUndecided && (
            <button
              type="button"
              onClick={() => set({ archId: null, price: "0", deposit: "0", method: null })}
              className={cn(
                "flex min-h-[72px] items-center gap-4 rounded-2xl border-2 border-dashed bg-card px-5 text-left transition-all active:scale-[0.98]",
                value.archId === null ? "border-amber-500 bg-amber-50" : "border-line",
              )}
            >
              <Clock className="size-8 text-amber-600" />
              <span className="flex-1 text-lg font-bold">Not decided yet</span>
              <span className="text-sm font-semibold text-muted">Put aside</span>
            </button>
          )}
        </div>
      </section>

      {value.archId && (
        <>
          <Field label="Price" hint="£">
            <Input inputMode="decimal" value={value.price} onChange={(e) => set({ price: e.target.value })} onFocus={(e) => e.target.select()} className="text-2xl font-extrabold" />
          </Field>
          <Field label="Deposit amount" hint="£">
            <Input inputMode="decimal" value={value.deposit} onChange={(e) => set({ deposit: e.target.value })} onFocus={(e) => e.target.select()} className="text-2xl font-extrabold" />
          </Field>
          <section>
            <h3 className="mb-3 text-[15px] font-bold">Deposit paid by</h3>
            <div className="flex flex-wrap gap-3">
              {methods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set({ method: m })}
                  className={cn(
                    "h-14 rounded-2xl border-2 px-6 text-[17px] font-bold transition-all active:scale-95",
                    value.method === m ? "border-primary bg-primary text-primary-foreground" : "border-line bg-card",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-lift">
        <p className="text-sm font-bold uppercase tracking-wider opacity-75">Balance due</p>
        <p className={cn("mt-1 text-6xl font-extrabold tabular-nums tracking-tight", balance < 0 && "text-red-300")}>{money(balance)}</p>
        <p className="mt-2 text-base font-semibold opacity-80">
          {money(parseMoney(value.price))} price − {money(parseMoney(value.deposit))} deposit
        </p>
      </div>
    </div>
  );
}
