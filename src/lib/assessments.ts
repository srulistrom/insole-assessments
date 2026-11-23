"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { photoPaths, type Assessment } from "@/lib/types";
import type { AppSettings } from "@/lib/settings";
import { downloadFoamPhoto, blobToDataUrl } from "@/lib/photos";
import { generatePdf } from "@/lib/pdf";

export interface SaveResult {
  assessment: Assessment;
  driveWarning: string | null;
}

/**
 * Build the PDF, store it in Supabase Storage and push everything to Google Drive.
 * `pictureBlobs` (optional) are the pictures in order, so a just-taken photo doesn't need downloading again.
 */
export async function finalizeFiles(id: string, settings: AppSettings, pictureBlobs?: (Blob | null)[]): Promise<SaveResult> {
  const supabase = supabaseBrowser();
  const { data: a, error } = await supabase.from("assessments").select("*").eq("id", id).single();
  if (error || !a) throw new Error(error?.message ?? "Assessment not found");
  const assessment = a as Assessment;

  const paths = photoPaths(assessment);
  const blobs = await Promise.all(paths.map(async (p, i) => pictureBlobs?.[i] ?? (await downloadFoamPhoto(p))));
  const photos = await Promise.all(blobs.map((b) => (b ? blobToDataUrl(b) : Promise.resolve(null))));

  const pdf = await generatePdf(assessment, settings, photos);
  const pdfPath = `${id}/${assessment.order_number}.pdf`;
  const up = await supabase.storage.from("pdfs").upload(pdfPath, pdf, { contentType: "application/pdf", upsert: true });
  if (up.error) throw new Error(`PDF upload failed: ${up.error.message}`);
  if (assessment.pdf_path !== pdfPath) {
    await supabase.from("assessments").update({ pdf_path: pdfPath }).eq("id", id);
  }

  let driveWarning: string | null = null;
  try {
    const res = await fetch("/api/drive/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) driveWarning = json.warning ?? json.error ?? "Google Drive sync failed";
  } catch {
    driveWarning = "Could not reach Google Drive (saved locally, will not retry automatically).";
  }

  const { data: fresh } = await supabase.from("assessments").select("*").eq("id", id).single();
  return { assessment: (fresh as Assessment) ?? assessment, driveWarning };
}

export interface OrderTerms {
  arch_type_id: string;
  arch_type_name: string;
  price: number;
  deposit_amount: number;
  deposit_payment_method: string | null;
}

/** Draft -> Order (Customer Approved). Does NOT touch label_printed. */
export async function convertDraft(id: string, terms: OrderTerms, settings: AppSettings): Promise<SaveResult> {
  const { error } = await supabaseBrowser()
    .from("assessments")
    .update({ ...terms, status: "new" })
    .eq("id", id)
    .eq("status", "draft");
  if (error) throw new Error(error.message);
  return finalizeFiles(id, settings);
}

export async function setStatus(id: string, status: Assessment["status"]) {
  const { error } = await supabaseBrowser().from("assessments").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markLabelPrinted(id: string) {
  const { error } = await supabaseBrowser()
    .from("assessments")
    .update({ label_printed: true, label_printed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("label_printed", false);
  if (error) throw new Error(error.message);
}
