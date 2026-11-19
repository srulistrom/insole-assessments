"use client";
import type { Assessment } from "@/lib/types";
import type { AppSettings } from "@/lib/settings";
import { rgb } from "@/lib/color";
import { fmtDate } from "@/lib/format";
import { urlToDataUrl } from "@/lib/photos";

function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

export function driveFolderName(a: Pick<Assessment, "order_number" | "last_name">) {
  return `${a.order_number} - ${a.last_name}`;
}

export function pdfFileName(a: Pick<Assessment, "order_number" | "first_name" | "last_name" | "status">) {
  const name = `${a.first_name} ${a.last_name}`.trim();
  return a.status === "draft" ? `DRAFT - ${a.order_number} - ${name}.pdf` : `${a.order_number} - ${name}.pdf`;
}

export async function generatePdf(
  a: Assessment,
  settings: AppSettings,
  photos: { right: string | null; left: string | null },
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = 210;
  const M = 14;
  const primary = rgb(settings.primary_color);
  const accent = rgb(settings.accent_color);
  const ink: [number, number, number] = [11, 19, 36];
  const muted: [number, number, number] = [91, 101, 119];

  // Header band
  doc.setFillColor(...primary);
  doc.rect(0, 0, W, 34, "F");
  let textX = M;
  if (settings.logo_url) {
    const logo = await urlToDataUrl(settings.logo_url);
    if (logo) {
      const { w, h } = await imageSize(logo);
      const maxH = 22;
      const maxW = 40;
      const s = Math.min(maxW / w, maxH / h);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(M, 6, w * s + 4, h * s + 4, 2, 2, "F");
      doc.addImage(logo, "PNG", M + 2, 8, w * s, h * s);
      textX = M + w * s + 10;
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(settings.shop_name || "Insole Assessment", textX, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const sub = [settings.shop_address, settings.shop_phone].filter(Boolean).join("   |   ");
  if (sub) doc.text(sub, textX, 21, { maxWidth: W - textX - M });
  doc.setFillColor(...accent);
  doc.rect(0, 34, W, 1.6, "F");

  // Title + order number
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(a.order_number, M, 52);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(`Created ${fmtDate(a.created_at, true)}`, M, 58);
  if (a.status === "draft") {
    doc.setFillColor(253, 230, 138);
    doc.roundedRect(W - M - 62, 42, 62, 11, 3, 3, "F");
    doc.setTextColor(120, 53, 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DRAFT - AWAITING DECISION", W - M - 31, 49, { align: "center" });
  }

  // Details grid
  const rows: [string, string][] = [
    ["Customer", `${a.first_name} ${a.last_name}`],
    ["Phone", a.phone],
    ["Email", a.email || "-"],
    ["Shoe size", a.shoe_size || "-"],
    ["Assessor", a.assessor_name || "-"],
    ["Arch type", a.arch_type_name || "Not decided yet"],
  ];
  let y = 70;
  rows.forEach(([k, v], i) => {
    const col = i % 2;
    const x = M + col * 92;
    if (col === 0 && i > 0) y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...muted);
    doc.text(k.toUpperCase(), x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ink);
    doc.text(v, x, y + 6, { maxWidth: 86 });
  });
  y += 20;

  const block = (title: string, body: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...muted);
    doc.text(title.toUpperCase(), M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...ink);
    const lines = doc.splitTextToSize(body || "-", W - 2 * M);
    doc.text(lines, M, y + 6);
    y += 6 + lines.length * 5 + 6;
  };
  block("Issue", a.issue || "");
  block("Notes", a.notes || "");

  // Money box
  doc.setFillColor(244, 246, 250);
  doc.roundedRect(M, y, W - 2 * M, 26, 4, 4, "F");
  const money = (n: number) => `£${Number(n).toFixed(2)}`;
  const cells: [string, string][] = [
    ["PRICE", money(a.price)],
    [`DEPOSIT${a.deposit_payment_method ? ` (${a.deposit_payment_method})` : ""}`, money(a.deposit_amount)],
    ["BALANCE DUE", money(a.balance_due)],
  ];
  cells.forEach(([k, v], i) => {
    const x = M + 6 + i * 60;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(k, x, y + 9);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(i === 2 ? 17 : 14);
    doc.setTextColor(...(i === 2 ? primary : ink));
    doc.text(v, x, y + 19);
  });
  y += 34;

  // Foam photos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ink);
  doc.text("Foam impressions", M, y);
  y += 4;
  const boxW = (W - 2 * M - 8) / 2;
  const boxH = Math.min(297 - y - 22, 80);
  const drawPhoto = async (label: string, data: string | null, x: number) => {
    doc.setDrawColor(227, 232, 240);
    doc.setFillColor(250, 251, 253);
    doc.roundedRect(x, y, boxW, boxH + 8, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...primary);
    doc.text(label, x + 4, y + 6);
    if (!data) return;
    const { w, h } = await imageSize(data);
    const s = Math.min((boxW - 8) / w, (boxH - 4) / h);
    doc.addImage(data, "JPEG", x + (boxW - w * s) / 2, y + 9, w * s, h * s);
  };
  await drawPhoto("RIGHT FOOT", photos.right, M);
  await drawPhoto("LEFT FOOT", photos.left, M + boxW + 8);

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(`${settings.shop_name || ""}  ${a.order_number}`.trim(), M, 290);
  doc.text(`Generated ${fmtDate(new Date().toISOString(), true)}`, W - M, 290, { align: "right" });

  return doc.output("blob");
}
