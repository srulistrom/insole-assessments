"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCheck, PackageCheck, Phone, Printer, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Assessment } from "@/lib/types";
import { fmtDate, fullName, initials, money } from "@/lib/format";
import { setStatus } from "@/lib/assessments";
import { StatusPill } from "@/components/status-pill";
import { ReadyModal } from "@/components/ready-modal";
import { Button } from "@/components/ui/button";

export function JobCard({ a, onChanged }: { a: Assessment; onChanged: () => void }) {
  const [dx, setDx] = useState(0);
  const [ready, setReady] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const locked = useRef(false);

  const onStart = (e: React.TouchEvent) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    locked.current = false;
  };
  const onMove = (e: React.TouchEvent) => {
    if (!start.current) return;
    const mx = e.touches[0].clientX - start.current.x;
    const my = e.touches[0].clientY - start.current.y;
    if (!locked.current && Math.abs(my) > Math.abs(mx)) {
      start.current = null;
      return;
    }
    locked.current = true;
    setDx(Math.max(-120, Math.min(0, mx)));
  };
  const onEnd = () => {
    if (dx < -90) window.location.href = `tel:${a.phone.replace(/\s/g, "")}`;
    setDx(0);
    start.current = null;
  };

  async function pickedUp() {
    try {
      await setStatus(a.id, "picked_up");
      toast.success("Picked up!");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const isDraft = a.status === "draft";
  const paid = a.balance_due <= 0;

  return (
    <div className="animate-rise relative overflow-hidden rounded-3xl">
      {/* swipe-to-call backdrop */}
      <div className="absolute inset-0 flex items-center justify-end bg-whatsapp pr-8 text-white">
        <Phone className="size-8" />
      </div>

      <article
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? "transform .25s ease" : "none" }}
        className={cn("relative rounded-3xl bg-card p-5 shadow-soft", isDraft && "ring-2 ring-amber-300")}
      >
        <Link href={`/jobs/${a.id}`} className="block">
          <div className="flex items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-xl font-extrabold text-primary-foreground">{initials(a)}</div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-2xl font-extrabold leading-tight tracking-tight">{fullName(a)}</h3>
              <p className="mt-0.5 text-sm font-bold text-muted">
                {a.order_number} · {fmtDate(a.created_at)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusPill status={a.status} />
            {isDraft && a.label_printed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[13px] font-extrabold text-emerald-800">
                <Check className="size-4 stroke-[3]" /> <Printer className="size-4" /> Label Printed
              </span>
            )}
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-base font-bold">{a.arch_type_name ?? "Arch type not decided"}</p>
              <p className="text-sm font-semibold text-muted">Assessor: {a.assessor_name ?? "-"}</p>
            </div>
            {!isDraft && (
              <div className="text-right">
                <p className="text-sm font-semibold text-muted">
                  {money(a.price)} · deposit {money(a.deposit_amount)}
                </p>
                <p className={cn("text-3xl font-extrabold tabular-nums leading-none", paid ? "text-emerald-600" : "text-primary")}>{paid ? "Paid" : money(a.balance_due)}</p>
                {!paid && <p className="text-xs font-bold uppercase tracking-wide text-muted">balance due</p>}
              </div>
            )}
          </div>
        </Link>

        <div className="mt-4 flex gap-2">
          <Button asChild variant="soft" size="sm" className="w-14 shrink-0 px-0" aria-label={`Call ${a.first_name}`}>
            <a href={`tel:${a.phone.replace(/\s/g, "")}`}>
              <Phone className="!size-5" />
            </a>
          </Button>
          {isDraft && (
            <Button asChild size="sm" className="flex-1">
              <Link href={`/jobs/${a.id}/convert`}>
                <CheckCheck className="!size-5" /> Convert to Order
              </Link>
            </Button>
          )}
          {(a.status === "new" || a.status === "sent_to_supplier") && (
            <Button size="sm" variant="gold" className="flex-1" onClick={() => setReady(true)}>
              <PackageCheck className="!size-5" /> Mark as Arrived
            </Button>
          )}
          {a.status === "arrived" && (
            <Button size="sm" className="flex-1" onClick={pickedUp}>
              <UserCheck className="!size-5" /> Mark as Picked Up
            </Button>
          )}
        </div>
      </article>

      <ReadyModal assessment={a} open={ready} onOpenChange={setReady} onDone={onChanged} />
    </div>
  );
}
