"use client";
import type { Assessment } from "@/lib/types";
import type { AppSettings } from "@/lib/settings";
import { fmtDate, fullName, money } from "@/lib/format";
import { shrinkDataUrl } from "@/lib/photos";

/** Greedy word wrap that only breaks at spaces and after hyphens (never in the middle of a word). */
function wrapName(doc: { getTextWidth: (t: string) => number }, name: string, maxW: number): { lines: string[]; fits: boolean } {
  const pieces: { text: string; space: boolean }[] = [];
  name.trim().split(/\s+/).forEach((word, wi) => {
    (word.match(/[^-]+-?|-/g) ?? [word]).forEach((p, pi) => pieces.push({ text: p, space: wi > 0 && pi === 0 }));
  });
  const lines: string[] = [];
  let cur = "";
  let fits = true;
  for (const p of pieces) {
    if (doc.getTextWidth(p.text) > maxW) fits = false; // a single chunk is wider than the label
    const next = cur ? cur + (p.space ? " " : "") + p.text : p.text;
    if (cur && doc.getTextWidth(next) > maxW) {
      lines.push(cur);
      cur = p.text;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return { lines, fits };
}

/**
 * The shipping label as a real PDF: A4 LANDSCAPE page (297 x 210 mm), label on the LEFT half only
 * (148.5 x 210 mm, portrait), dashed fold line down the middle, right half blank.
 * Fold the printed sheet on the dashed line to get an A5 portrait label.
 *
 * Phones print PDFs at the PDF's own page size and orientation, which web-page printing (CSS @page)
 * does not reliably do on iPhone/iPad/Android - so this is the dependable way to print from a phone.
 */

const PAGE_W = 297;
const PAGE_H = 210;
const FOLD_X = PAGE_W / 2; // 148.5
const M = 12; // label margin
const X = M;
const W = FOLD_X - 2 * M; // 124.5 content width

function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

export function labelFileName(a: Pick<Assessment, "order_number" | "last_name">) {
  return `Label ${a.order_number} - ${a.last_name}.pdf`;
}

export async function generateLabelPdf(a: Assessment, settings: AppSettings, assets: { logo: string | null; qr: string | null }): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  doc.setProperties({ title: `Label ${a.order_number}` });
  const isDraft = a.status === "draft";
  const pt = (n: number) => n * 0.3528; // points -> mm

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  // ---- header: logo + shop details
  let y = M;
  let textX = X;
  let headH = 14;
  if (assets.logo) {
    const logo = await shrinkDataUrl(assets.logo, 500);
    const { w, h } = await imageSize(logo);
    const s = Math.min(40 / w, 20 / h);
    doc.addImage(logo, logo.startsWith("data:image/jpeg") ? "JPEG" : "PNG", X, y, w * s, h * s, undefined, "FAST");
    textX = X + w * s + 5;
    headH = Math.max(headH, h * s);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const shopLines = doc.splitTextToSize(settings.shop_name || "Insole Assessment", X + W - textX).slice(0, 2);
  doc.text(shopLines, textX, y + 6);
  const addr = [settings.shop_address, settings.shop_phone].filter(Boolean).join(" · ");
  if (addr) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(addr, X + W - textX).slice(0, 3), textX, y + 6 + shopLines.length * pt(14) * 1.15 + 1.5);
  }
  y += headH + 3;
  doc.setLineWidth(0.5);
  doc.line(X, y, X + W, y);

  // ---- big order number
  y += 15.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(44);
  doc.text(a.order_number, X, y);

  // ---- draft badge
  if (isDraft) {
    doc.setFontSize(9);
    const label = "DRAFT - AWAITING DECISION";
    const tw = doc.getTextWidth(label);
    doc.setLineWidth(0.6);
    doc.rect(X, y + 3, tw + 8, 7);
    doc.text(label, X + 4, y + 7.8);
    y += 10;
  }

  // ---- customer name, shrinking to fit on at most two lines
  const name = fullName(a);
  let size = 24;
  let lines: string[] = [];
  doc.setFont("helvetica", "bold");
  for (; size >= 11; size -= 1) {
    doc.setFontSize(size);
    const r = wrapName(doc, name, W);
    lines = r.lines;
    if (lines.length <= 2 && r.fits) break;
  }
  lines = lines.slice(0, 2);
  doc.setFontSize(size);
  y += 4 + pt(size);
  lines.forEach((ln, i) => doc.text(ln, X, y + i * pt(size) * 1.12));
  y += (lines.length - 1) * pt(size) * 1.12 + 2;

  // ---- detail rows
  const row = (label: string, value: string | null | undefined) => {
    if (!value || !value.trim()) return;
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text(label.toUpperCase(), X, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11.5);
    const v = doc.splitTextToSize(value, W - 32)[0];
    doc.text(v, X + W, y, { align: "right" });
    doc.setDrawColor(190, 190, 190);
    doc.setLineWidth(0.2);
    doc.line(X, y + 2, X + W, y + 2);
    doc.setDrawColor(0, 0, 0);
  };
  row("Phone", a.phone);
  row("Date", fmtDate(a.created_at));
  row("Shoe size", a.shoe_size);
  row("Arch type", a.arch_type_name ?? "Not decided yet");
  row("Assessor", a.assessor_name);

  // ---- issue (max 3 lines)
  if (a.issue && a.issue.trim()) {
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let iss = doc.splitTextToSize(`Issue: ${a.issue.trim()}`, W) as string[];
    if (iss.length > 3) iss = [...iss.slice(0, 2), iss[2].replace(/\s*\S*$/, "") + "…"];
    doc.text(iss, X, y);
    y += (iss.length - 1) * pt(10) * 1.2;
  }

  // ---- money box (orders only)
  if (!isDraft) {
    y += 5;
    doc.setLineWidth(0.7);
    doc.rect(X, y, W, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const dep = `Deposit ${money(a.deposit_amount)}${a.deposit_payment_method ? ` (${a.deposit_payment_method})` : ""}`;
    doc.text(doc.splitTextToSize(dep, W - 8)[0], X + 4, y + 7);
    doc.setFontSize(8);
    doc.text("BALANCE DUE", X + 4, y + 16);
    doc.setFontSize(20);
    doc.text(money(a.balance_due), X + W - 4, y + 16.5, { align: "right" });
  }

  // ---- QR code pinned to the bottom-left of the label
  const qrSize = 30;
  const qrY = PAGE_H - M - qrSize;
  if (assets.qr) doc.addImage(await shrinkDataUrl(assets.qr, 300), "PNG", X, qrY, qrSize, qrSize, undefined, "FAST");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(["Scan to open this job", a.order_number], X + W, qrY + qrSize - 1, { align: "right" });

  // ---- fold line down the middle of the A4 sheet
  doc.setLineWidth(0.7);
  doc.setLineDashPattern([2.4, 1.8], 0);
  doc.line(FOLD_X, 0, FOLD_X, PAGE_H);
  doc.setLineDashPattern([], 0);
  doc.setFillColor(255, 255, 255);
  doc.rect(FOLD_X - 3.2, PAGE_H / 2 - 17, 6.4, 34, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setCharSpace(0.9);
  const ft = doc.getTextWidth("FOLD HERE");
  doc.text("FOLD HERE", FOLD_X + 1.2, PAGE_H / 2 + ft / 2, { angle: 90 });
  doc.setCharSpace(0);

  return doc.output("blob");
}
