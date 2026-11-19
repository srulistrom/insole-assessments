"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Assessment } from "@/lib/types";
import { fmtDate, fullName, money } from "@/lib/format";
import { markLabelPrinted } from "@/lib/assessments";
import { urlToDataUrl } from "@/lib/photos";
import { useSettings } from "@/components/settings-provider";
import { Button } from "@/components/ui/button";

// A4 landscape sheet. Only the LEFT half (148mm x 210mm, portrait) carries the label.
// Fold the sheet down the dashed line -> A5 portrait.
const PRINT_CSS = `
@page { size: A4 landscape; margin: 0; }
.sheet { position: relative; width: 297mm; height: 210mm; background: #fff; color: #000; overflow: hidden; font-family: Arial, Helvetica, sans-serif; }
.label { width: 148mm; height: 210mm; float: left; padding: 12mm; box-sizing: border-box; display: flex; flex-direction: column; }
.fold-line { border-right: 2px dashed #000; height: 210mm; position: absolute; left: 0; top: 0; width: 148mm; pointer-events: none; }
.fold-text { position: absolute; left: 148mm; top: 105mm; transform: translate(-50%, -50%) rotate(-90deg); background: #fff; padding: 0 4mm; font-size: 9pt; font-weight: 700; letter-spacing: 3px; white-space: nowrap; }
.lbl-head { display: flex; align-items: center; gap: 5mm; padding-bottom: 5mm; border-bottom: 1.5px solid #000; }
.lbl-logo { max-height: 22mm; max-width: 42mm; object-fit: contain; }
.lbl-shop { font-size: 15pt; font-weight: 800; line-height: 1.15; }
.lbl-shop small { display: block; font-size: 8.5pt; font-weight: 500; margin-top: 1mm; }
.lbl-order { font-size: 54pt; font-weight: 900; letter-spacing: -1px; line-height: 1; margin: 7mm 0 2mm; }
.lbl-draft { display: inline-block; border: 2px solid #000; padding: 1.5mm 4mm; font-size: 11pt; font-weight: 800; letter-spacing: 1px; margin-bottom: 3mm; }
.lbl-name { font-size: 24pt; font-weight: 800; line-height: 1.1; margin-bottom: 4mm; }
.lbl-row { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; padding: 2.2mm 0; border-bottom: 0.75px solid #bbb; font-size: 12.5pt; }
.lbl-row span:first-child { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #444; white-space: nowrap; }
.lbl-row span:last-child { font-weight: 700; text-align: right; }
.lbl-issue { font-size: 11pt; padding: 2.2mm 0; line-height: 1.3; max-height: 22mm; overflow: hidden; }
.lbl-money { margin-top: 3mm; border: 2px solid #000; padding: 3mm 4mm; display: flex; justify-content: space-between; align-items: center; font-weight: 800; }
.lbl-money .bal { font-size: 22pt; }
.lbl-qr { margin-top: auto; display: flex; align-items: flex-end; justify-content: space-between; gap: 4mm; }
.lbl-qr img { width: 34mm; height: 34mm; }
.lbl-qr p { font-size: 8pt; max-width: 60mm; text-align: right; }
@media print {
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  .no-print { display: none !important; }
  .preview-wrap { height: auto !important; width: auto !important; overflow: visible !important; }
  .sheet { transform: none !important; box-shadow: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export function PrintView({ id }: { id: string }) {
  const params = useSearchParams();
  const settings = useSettings();
  const [a, setA] = useState<Assessment | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null | undefined>(undefined); // undefined = still loading
  const [scale, setScale] = useState(0.3);
  const [done, setDone] = useState(false);
  const autoFired = useRef(false);

  const auto = params.get("auto") === "1";
  const fromDraft = params.get("from") === "draft";

  useEffect(() => {
    supabaseBrowser().from("assessments").select("*").eq("id", id).maybeSingle().then(({ data }) => setA(data as Assessment | null));
  }, [id]);

  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/jobs/${id}`, { margin: 0, width: 360 }).then(setQr);
  }, [id]);

  // Embed the logo as a data URL so it is guaranteed to be loaded before printing.
  useEffect(() => {
    if (!settings.logo_url) return setLogo(null);
    urlToDataUrl(settings.logo_url).then((d) => setLogo(d));
  }, [settings.logo_url]);

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - 24) / (297 * 3.7795)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const doPrint = useCallback(async () => {
    if (!a) return;
    window.print();
    if (!a.label_printed) {
      try {
        await markLabelPrinted(a.id);
        setA((x) => (x ? { ...x, label_printed: true, label_printed_at: new Date().toISOString() } : x));
        toast.success("Printed!");
      } catch (e) {
        toast.error((e as Error).message);
      }
    } else {
      toast.success("Printed!");
    }
    setDone(true);
  }, [a]);

  // Draft saved -> print immediately once everything the label needs has loaded.
  useEffect(() => {
    if (!auto || autoFired.current || !a || !qr || logo === undefined) return;
    autoFired.current = true;
    const t = setTimeout(doPrint, 350);
    return () => clearTimeout(t);
  }, [auto, a, qr, logo, doPrint]);

  if (!a) return <div className="p-10 text-center text-lg font-bold">Loading label…</div>;

  const isDraft = a.status === "draft";
  const backHref = fromDraft || isDraft ? "/jobs?tab=drafts" : `/jobs/${a.id}`;

  return (
    <div className="min-h-dvh bg-slate-200">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="no-print sticky top-0 z-20 bg-card px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] shadow-soft">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button asChild variant="outline" className="w-14 shrink-0 px-0" aria-label="Back">
            <Link href={backHref}>
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold">
              {a.order_number} · {fullName(a)}
            </p>
            <p className="text-sm font-semibold text-muted">A4 landscape - fold down the dashed line</p>
          </div>
          <Button size="lg" onClick={doPrint} disabled={!qr || logo === undefined}>
            <Printer /> {a.label_printed ? "Print again" : "Print"}
          </Button>
        </div>
        {done && (
          <div className="animate-rise mx-auto mt-3 flex max-w-3xl items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
            <p className="text-[15px] font-bold text-emerald-900">Label printed. Fold on the dashed line and stick it on the foam box.</p>
            <Button asChild size="sm">
              <Link href={backHref}>Done</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="preview-wrap mx-auto my-4" style={{ width: 297 * 3.7795 * scale, height: 210 * 3.7795 * scale }}>
        <div className="sheet shadow-lift" style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <div className="label">
            <div className="lbl-head">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logo && <img src={logo} alt="" className="lbl-logo" />}
              <div className="lbl-shop">
                {settings.shop_name || "Insole Assessment"}
                {(settings.shop_address || settings.shop_phone) && <small>{[settings.shop_address, settings.shop_phone].filter(Boolean).join(" · ")}</small>}
              </div>
            </div>

            <div className="lbl-order">{a.order_number}</div>
            {isDraft && <div className="lbl-draft">DRAFT - AWAITING DECISION</div>}
            <div className="lbl-name">{fullName(a)}</div>

            <div className="lbl-row">
              <span>Phone</span>
              <span>{a.phone}</span>
            </div>
            <div className="lbl-row">
              <span>Date</span>
              <span>{fmtDate(a.created_at)}</span>
            </div>
            {a.shoe_size && (
              <div className="lbl-row">
                <span>Shoe size</span>
                <span>{a.shoe_size}</span>
              </div>
            )}
            <div className="lbl-row">
              <span>Arch type</span>
              <span>{a.arch_type_name ?? "Not decided yet"}</span>
            </div>
            <div className="lbl-row">
              <span>Assessor</span>
              <span>{a.assessor_name ?? "-"}</span>
            </div>
            {a.issue && (
              <div className="lbl-issue">
                <b>Issue:</b> {a.issue}
              </div>
            )}

            {!isDraft && (
              <div className="lbl-money">
                <div style={{ fontSize: "11pt" }}>
                  Deposit {money(a.deposit_amount)}
                  {a.deposit_payment_method ? ` (${a.deposit_payment_method})` : ""}
                </div>
                <div>
                  <span style={{ fontSize: "9pt", marginRight: "2mm" }}>BALANCE DUE</span>
                  <span className="bal">{money(a.balance_due)}</span>
                </div>
              </div>
            )}

            <div className="lbl-qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr && <img src={qr} alt="QR code" />}
              <p>Scan to open this job · {a.order_number}</p>
            </div>
          </div>

          <div className="fold-line" />
          <div className="fold-text">FOLD HERE</div>
        </div>
      </div>
    </div>
  );
}
