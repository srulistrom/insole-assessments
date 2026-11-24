"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Archive, CheckCheck, CloudOff, FileText, HardDriveUpload, MessageCircle, PackageCheck, Pencil, Phone, Printer, Send, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";
import { photoPaths, type Assessment } from "@/lib/types";
import { getJobsCache, patchJobCache } from "@/lib/jobs-cache";
import { fmtDate, fullName, money, toIntlPhone } from "@/lib/format";
import { setStatus } from "@/lib/assessments";
import { useSignedUrl } from "@/lib/photos";
import { useSettings } from "@/components/settings-provider";
import { StatusPill } from "@/components/status-pill";
import { MoneyTiles } from "@/components/money-tiles";
import { SupplierSheet } from "@/components/supplier-sheet";
import { ReadyModal } from "@/components/ready-modal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function Photo({ path, label }: { path: string | null; label: string }) {
  const url = useSignedUrl("foam-photos", path);
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-primary/5">
      {url && (
        <a href={url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="size-full object-cover" />
        </a>
      )}
      <span className="absolute bottom-2 left-2 rounded-full bg-ink/70 px-3 py-1 text-xs font-extrabold text-white">{label}</span>
    </div>
  );
}

export function JobDetail({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { country_code } = useSettings();
  // Show the job instantly from the list we already loaded, then refresh it in the background.
  const [a, setA] = useState<Assessment | null>(() => getJobsCache()?.find((r) => r.id === id) ?? null);
  const [missing, setMissing] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [ready, setReady] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const pdfUrl = useSignedUrl("pdfs", a?.pdf_path);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from("assessments").select("*").eq("id", id).maybeSingle();
    if (!data) setMissing(true);
    else {
      setA(data as Assessment);
      patchJobCache(data as Assessment);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // After converting a draft we land here with ?send=1 to go straight to the supplier message.
  useEffect(() => {
    if (a && params.get("send") === "1" && a.status === "new") {
      setSheet(true);
      router.replace(`/jobs/${id}`, { scroll: false });
    }
  }, [a, params, id, router]);

  if (missing) return <p className="py-20 text-center text-lg font-bold">Job not found.</p>;
  if (!a) return <div className="h-96 animate-pulse rounded-3xl bg-card" />;

  const isDraft = a.status === "draft";
  const paid = a.balance_due <= 0;

  async function act(fn: () => Promise<void>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <Link href="/jobs" className="inline-flex h-11 items-center gap-2 rounded-full pr-4 text-base font-bold text-primary">
        <ArrowLeft className="size-5" /> Jobs
      </Link>

      <section className="rounded-3xl bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-extrabold uppercase tracking-wider text-muted">{a.order_number}</p>
            <h1 className="mt-1 break-words text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-3xl">{fullName(a)}</h1>
          </div>
          <StatusPill status={a.status} className="self-start" />
        </div>

        <div className="mt-5 grid gap-3 min-[430px]:grid-cols-2">
          <Button asChild variant="soft">
            <a href={`tel:${a.phone.replace(/\s/g, "")}`}>
              <Phone /> {a.phone}
            </a>
          </Button>
          <Button asChild variant="soft">
            <a href={`https://wa.me/${toIntlPhone(a.phone, country_code)}`} target="_blank" rel="noreferrer">
              <MessageCircle /> WhatsApp
            </a>
          </Button>
        </div>

        <dl className="mt-5 divide-y divide-line">
          {[
            ["Shoe size", a.shoe_size],
            ["Email", a.email],
            ["Issue", a.issue],
            ["Notes", a.notes],
            ["Assessor", a.assessor_name],
            ["Created", fmtDate(a.created_at, true)],
            ["Sent to supplier", fmtDate(a.sent_to_supplier_at, true)],
            ["Arrived", fmtDate(a.arrived_at, true)],
            ["Picked up", fmtDate(a.picked_up_at, true)],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3">
                <dt className="text-[15px] font-semibold text-muted">{k}</dt>
                <dd className="text-right text-[17px] font-bold">{v}</dd>
              </div>
            ))}
        </dl>
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-soft">
        <p className="text-sm font-extrabold uppercase tracking-wider text-muted">Arch type</p>
        <p className="mt-1 text-2xl font-extrabold">{a.arch_type_name ?? "Not decided yet"}</p>
        {isDraft ? (
          <p className="mt-2 text-base font-medium text-muted">Waiting for the customer to decide. No price or deposit yet.</p>
        ) : (
          <MoneyTiles className="mt-4" onCard price={a.price} deposit={a.deposit_amount} method={a.deposit_payment_method} balance={a.balance_due} />
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        {photoPaths(a).map((p, i) => (
          <Photo key={p} path={p} label={`Picture ${i + 1}`} />
        ))}
      </section>

      <section className="space-y-2 rounded-3xl bg-card p-5 text-[15px] font-semibold shadow-soft">
        <p className="flex items-center gap-2">
          <Printer className="size-5 text-muted" />
          {a.label_printed ? `Label printed ${fmtDate(a.label_printed_at, true)}` : "Label not printed yet"}
        </p>
        <p className="flex items-center gap-2">
          {a.drive_synced_at ? <HardDriveUpload className="size-5 text-emerald-600" /> : <CloudOff className="size-5 text-amber-600" />}
          {a.drive_synced_at ? `Backed up to Google Drive ${fmtDate(a.drive_synced_at, true)}` : "Not backed up to Google Drive"}
        </p>
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-bold text-primary">
            <FileText className="size-5" /> Open PDF
          </a>
        )}
      </section>

      {/* actions */}
      <section className="space-y-3">
        {isDraft && (
          <>
            {a.label_printed && (
              <p className="rounded-2xl bg-emerald-50 p-4 text-[15px] font-semibold text-emerald-900">
                Label already printed on {fmtDate(a.label_printed_at, true)} - use the existing label on the foam box.
              </p>
            )}
            <Button asChild size="lg" className="w-full">
              <Link href={`/jobs/${a.id}/convert`}>
                <CheckCheck /> Convert to Order / Customer Approved
              </Link>
            </Button>
            <Button variant="whatsapp" size="lg" className="w-full" onClick={() => setSheet(true)}>
              <Send /> Ask supplier's opinion
            </Button>
            <Button variant="destructive-outline" className="w-full" onClick={() => setConfirmCancel(true)}>
              <Archive /> Archive / Cancel Draft
            </Button>
          </>
        )}
        {(a.status === "new" || a.status === "sent_to_supplier") && (
          <>
            <Button variant="whatsapp" size="lg" className="w-full" onClick={() => setSheet(true)}>
              <Send /> {a.status === "new" ? "Send to Supplier" : "Send to Supplier again"}
            </Button>
            <Button variant="gold" size="lg" className="w-full" onClick={() => setReady(true)}>
              <PackageCheck /> Mark as Arrived
            </Button>
          </>
        )}
        {a.status === "arrived" && (
          <Button size="lg" className="w-full" onClick={() => act(() => setStatus(a.id, "picked_up"), "Picked up!")}>
            <UserCheck /> Mark as Picked Up
          </Button>
        )}
        {!isDraft && a.status !== "cancelled" && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/jobs/${a.id}/edit`}>
              <Pencil /> Edit order
            </Link>
          </Button>
        )}
        {!isDraft && a.status !== "cancelled" && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/print/${a.id}`}>
              <Printer /> {a.label_printed ? "Reprint Label" : "Print Label"}
            </Link>
          </Button>
        )}
        {isDraft && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/print/${a.id}?reprint=1`}>
              <Printer /> Reprint draft label
            </Link>
          </Button>
        )}
        {(a.status === "new" || a.status === "sent_to_supplier") && (
          <Button variant="destructive-outline" className="w-full" onClick={() => setConfirmCancel(true)}>
            <Archive /> Cancel order
          </Button>
        )}
      </section>

      <SupplierSheet assessment={a} open={sheet} onOpenChange={setSheet} onSent={load} />
      <ReadyModal assessment={a} open={ready} onOpenChange={setReady} onDone={load} />

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent title={isDraft ? "Archive this draft?" : "Cancel this order?"} description={`${fullName(a)} · ${a.order_number}. It moves to Cancelled and stays on record.`}>
          <div className="space-y-3">
            <Button
              variant="destructive"
              size="lg"
              className="w-full"
              onClick={async () => {
                await act(() => setStatus(a.id, "cancelled"), "Cancelled");
                setConfirmCancel(false);
                router.push("/jobs");
              }}
            >
              Yes, cancel it
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setConfirmCancel(false)}>
              No, keep it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
