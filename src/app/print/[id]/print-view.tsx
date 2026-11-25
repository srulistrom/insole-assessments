"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, Download, Printer, Send } from "lucide-react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Assessment } from "@/lib/types";
import { fmtDate, fullName, money } from "@/lib/format";
import { markLabelPrinted } from "@/lib/assessments";
import { generateLabelPdf, labelFileName } from "@/lib/label-pdf";
import { urlToDataUrl } from "@/lib/photos";
import { useSettings } from "@/components/settings-provider";
import { Button } from "@/components/ui/button";
import { SupplierSheet } from "@/components/supplier-sheet";

// A4 landscape sheet. Only the LEFT half (148mm x 210mm, portrait) carries the label.
// Fold the sheet down the dashed line -> A5 portrait.
//
// The label is built from three fixed regions (header / body / QR code) so that long names or notes
// can never push the QR code off the page or spill the sheet onto a second page.
const PRINT_CSS = `
@page { size: A4 portrait; margin: 0; }
.sheet { position: relative; width: 297mm; height: 210mm; background: #fff; color: #000; overflow: hidden; font-family: Arial, Helvetica, sans-serif; }
.label { width: 148mm; height: 210mm; float: left; padding: 12mm; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }
.fold-line { border-right: 2px dashed #000; height: 210mm; position: absolute; left: 0; top: 0; width: 148mm; pointer-events: none; }
.fold-text { position: absolute; left: 148mm; top: 105mm; transform: translate(-50%, -50%) rotate(-90deg); background: #fff; padding: 0 4mm; font-size: 9pt; font-weight: 700; letter-spacing: 3px; white-space: nowrap; }
.lbl-head { flex: none; display: flex; align-items: center; gap: 5mm; padding-bottom: 4mm; border-bottom: 1.5px solid #000; min-height: 20mm; }
.lbl-logo { max-height: 20mm; max-width: 40mm; object-fit: contain; }
.lbl-shop { font-size: 14pt; font-weight: 800; line-height: 1.15; }
.lbl-shop small { display: block; font-size: 8pt; font-weight: 500; margin-top: 1mm; }
.lbl-body { flex: 1 1 auto; min-height: 0; overflow: hidden; }
.lbl-order { font-size: 44pt; font-weight: 900; letter-spacing: -1px; line-height: 1; margin: 5mm 0 2mm; }
.lbl-draft { display: inline-block; border: 2px solid #000; padding: 1mm 3mm; font-size: 9pt; font-weight: 800; letter-spacing: 1px; margin-bottom: 2mm; }
.lbl-name { font-weight: 800; line-height: 1.1; margin-bottom: 2mm; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.lbl-row { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; padding: 1.8mm 0; border-bottom: 0.75px solid #bbb; font-size: 11.5pt; }
.lbl-row span:first-child { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #444; white-space: nowrap; }
.lbl-row span:last-child { font-weight: 700; text-align: right; overflow-wrap: anywhere; }
.lbl-issue { font-size: 10pt; padding-top: 2mm; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.lbl-money { margin-top: 3mm; border: 2px solid #000; padding: 2.5mm 4mm; font-weight: 800; }
.lbl-money .dep { font-size: 10pt; }
.lbl-money .balrow { display: flex; justify-content: space-between; align-items: baseline; margin-top: 1mm; }
.lbl-money .balrow span:first-child { font-size: 8pt; letter-spacing: .5px; }
.lbl-money .bal { font-size: 20pt; font-weight: 900; }
.lbl-qr { flex: none; height: 30mm; display: flex; align-items: flex-end; justify-content: space-between; gap: 4mm; }
.lbl-qr img { width: 30mm; height: 30mm; }
.lbl-qr p { font-size: 8pt; text-align: right; }
@media print {
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; height: auto !important; }
  .print-root { background: #fff !important; min-height: 0 !important; }
  .no-print { display: none !important; }
  /* The page is plain A4 PORTRAIT (every printer's default, so nothing has to be changed in the print window).
     The landscape sheet is turned a quarter-turn inside it, so the ink lands on the paper exactly as a landscape print would:
     label on one half, dashed fold line across the middle, other half blank. */
  .preview-wrap { position: relative !important; width: 209.5mm !important; height: 296.5mm !important; overflow: hidden !important; margin: 0 !important; }
  .sheet { position: absolute !important; top: 0 !important; left: 0 !important; transform-origin: 0 0 !important; transform: translate(209.5mm, 0) rotate(90deg) !important; box-shadow: none !important; height: 209.5mm !important; break-after: avoid; break-inside: avoid; }
  .label { height: 209.5mm !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

/** Long names get a smaller font so they stay within two lines on the label. */
function nameFontPt(name: string) {
  const n = name.length;
  return n <= 14 ? 26 : n <= 22 ? 22 : n <= 30 ? 18 : 15;
}

export function PrintView({ id }: { id: string }) {
  const params = useSearchParams();
  const settings = useSettings();
  const [a, setA] = useState<Assessment | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null | undefined>(undefined); // undefined = still loading
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  // iPhone/iPad Safari ignores the A4-landscape print setting, so those use the exact-size PDF instead.
  // Android and computers print the page itself, which opens the normal print dialog straight away.
  const [isIOS, setIsIOS] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [scale, setScale] = useState(0.3);
  const [done, setDone] = useState(false);
  const autoFired = useRef(false);
  const pdfBuilt = useRef(false);

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
    const src = settings.logo_dark_url ?? settings.logo_url; // paper is white, so prefer the dark artwork
    if (!src) return setLogo(null);
    urlToDataUrl(src).then((d) => setLogo(d));
  }, [settings.logo_url, settings.logo_dark_url]);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1));
    const fit = () => setScale(Math.min(1, (window.innerWidth - 24) / (297 * 3.7795)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Build the exact-size PDF version once everything is loaded (used for printing from phones/tablets).
  useEffect(() => {
    if (!a || !qr || logo === undefined || pdfBuilt.current) return;
    pdfBuilt.current = true;
    generateLabelPdf(a, settings, { logo, qr })
      .then((blob) => setPdfUrl(URL.createObjectURL(blob)))
      .catch(() => {
        pdfBuilt.current = false;
      });
  }, [a, qr, logo, settings]);

  const doPrint = useCallback(async () => {
    if (!a) return;
    if (isIOS && pdfUrl) {
      // iPhone/iPad: open the PDF so it prints at true A4 landscape from Share > Print.
      window.open(pdfUrl, "_blank");
    } else {
      window.print();
    }
    if (!a.label_printed) {
      try {
        await markLabelPrinted(a.id);
        setA((x) => (x ? { ...x, label_printed: true, label_printed_at: new Date().toISOString() } : x));
        toast.success(isIOS ? "Label PDF opened" : "Printed!");
      } catch (e) {
        toast.error((e as Error).message);
      }
    } else {
      toast.success(isIOS ? "Label PDF opened" : "Printed!");
    }
    setDone(true);
  }, [a, isIOS, pdfUrl]);

  // Draft saved -> open the print dialog immediately (iPhone/iPad need a tap first: Safari blocks pop-ups that aren't tapped).
  useEffect(() => {
    if (!auto || isIOS || autoFired.current || !a || !qr || logo === undefined) return;
    autoFired.current = true;
    const t = setTimeout(doPrint, 350);
    return () => clearTimeout(t);
  }, [auto, isIOS, a, qr, logo, doPrint]);

  if (!a) return <div className="p-10 text-center text-lg font-bold">Loading label…</div>;

  const isDraft = a.status === "draft";
  const backHref = fromDraft || isDraft ? "/jobs?tab=drafts" : `/jobs/${a.id}`;
  const ready = !!qr && logo !== undefined && (!isIOS || !!pdfUrl);
  const fullNameText = fullName(a);

  return (
    <div className="print-root min-h-dvh bg-slate-200">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="no-print sticky top-0 z-20 bg-card px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] shadow-soft">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="w-14 shrink-0 px-0" aria-label="Back">
              <Link href={backHref}>
                <ArrowLeft />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-extrabold">
                {a.order_number} · {fullNameText}
              </p>
              <p className="text-sm font-semibold text-muted">Print on A4 - then fold on the dashed line</p>
            </div>
          </div>

          {auto && isIOS && !done && (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-[15px] font-bold text-emerald-900">
              {isDraft ? "Draft saved." : "Saved."} Tap the button below to open the label for printing.
            </p>
          )}

          <Button size="lg" className="w-full" onClick={doPrint} disabled={!ready}>
            <Printer /> {!ready ? "Preparing label…" : a.label_printed ? "Print again" : "Print label"}
          </Button>

          {pdfUrl && (
            <p className="text-center text-sm font-semibold text-muted">
              {isIOS ? (
                <>
                  The label opens as a PDF. Tap <b>Share</b>, then <b>Print</b>, and choose <b>A4</b>.{" "}
                </>
              ) : (
                <>
                  In the print window choose your printer and press print. Leave it on <b>A4</b> and <b>Portrait</b> - the label is already turned to fit.{" "}
                </>
              )}
              <a href={pdfUrl} download={labelFileName(a)} className="inline-flex items-center gap-1 font-bold text-primary underline">
                <Download className="size-4" /> Save PDF
              </a>
            </p>
          )}

          {isDraft && (
            <Button variant="whatsapp" size="lg" className="w-full" onClick={() => setAskOpen(true)}>
              <Send /> Ask supplier's opinion
            </Button>
          )}

          {done && (
            <div className="animate-rise flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-[15px] font-bold text-emerald-900">Fold on the dashed line, then stick the label on the foam box.</p>
              <Button asChild size="sm" className="shrink-0">
                <Link href={backHref}>Done</Link>
              </Button>
            </div>
          )}
        </div>
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

            <div className="lbl-body">
              <div className="lbl-order">{a.order_number}</div>
              {isDraft && <div className="lbl-draft">DRAFT - AWAITING DECISION</div>}
              <div className="lbl-name" style={{ fontSize: `${nameFontPt(fullNameText)}pt` }}>
                {fullNameText}
              </div>

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
                  <div className="dep">
                    Deposit {money(a.deposit_amount)}
                    {a.deposit_payment_method ? ` (${a.deposit_payment_method})` : ""}
                  </div>
                  <div className="balrow">
                    <span>BALANCE DUE</span>
                    <span className="bal">{money(a.balance_due)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="lbl-qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr && <img src={qr} alt="QR code" />}
              <p>
                Scan to open this job
                <br />
                {a.order_number}
              </p>
            </div>
          </div>

          <div className="fold-line" />
          <div className="fold-text">FOLD HERE</div>
        </div>
      </div>

      <SupplierSheet assessment={a} open={askOpen} onOpenChange={setAskOpen} />

    </div>
  );
}
