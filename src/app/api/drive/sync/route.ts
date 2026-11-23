import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { photoPaths, pictureFileName } from "@/lib/types";
import {
  GoogleAuthError,
  accessTokenFromRefresh,
  createFolder,
  findFileInFolder,
  findOrCreateFolder,
  folderUsable,
  renameFile,
  uploadFile,
} from "@/lib/google";

export const maxDuration = 60;

const ROOT_NAME = "Insole Orders";

/**
 * Uploads/refreshes the order folder in the connected Google Drive:
 *   /Insole Orders/{OrderNumber} - {LastName}/  ->  PDF + Picture 1.jpg + Picture 2.jpg (+ more)
 * Idempotent: the same folder + PDF file are updated in place (draft -> final), never duplicated.
 */
export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: integ } = await admin.from("integrations").select("data").eq("provider", "google").maybeSingle();
  const refresh: string | undefined = integ?.data?.refresh_token;
  if (!refresh || !process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ ok: false, warning: "Google Drive isn't connected - saved in the app only. Connect it in Settings." });
  }

  const { data: a } = await admin.from("assessments").select("*").eq("id", id).maybeSingle();
  if (!a) return NextResponse.json({ ok: false, error: "Assessment not found" }, { status: 404 });

  try {
    const token = await accessTokenFromRefresh(refresh);

    // Root folder (remembered between calls)
    let rootId: string | undefined = integ?.data?.root_folder_id;
    if (!rootId || !(await folderUsable(token, rootId))) {
      rootId = await findOrCreateFolder(token, ROOT_NAME, null);
      await admin.from("integrations").update({ data: { ...integ!.data, root_folder_id: rootId } }).eq("provider", "google");
    }

    // Order folder: reuse the same one when a draft becomes an order.
    const folderName = `${a.order_number} - ${a.last_name}`;
    let folderId: string | null = a.drive_folder_id;
    let pdfFileId: string | null = a.drive_pdf_file_id;
    if (folderId && !(await folderUsable(token, folderId))) {
      folderId = null;
      pdfFileId = null;
    }
    if (folderId) await renameFile(token, folderId, folderName);
    else folderId = await createFolder(token, folderName, rootId);

    // Photos
    for (const path of photoPaths(a)) {
      const name = pictureFileName(path); // "Picture 1.jpg", "Picture 2.jpg", "Picture 3.jpg"… (older orders: Right.jpg / Left.jpg)
      const { data: blob } = await admin.storage.from("foam-photos").download(path);
      if (!blob) continue;
      const existing = await findFileInFolder(token, folderId, name);
      await uploadFile(token, { name, mime: "image/jpeg", body: new Uint8Array(await blob.arrayBuffer()), parent: folderId, fileId: existing });
    }

    // PDF ("DRAFT - INS-001 - Name" until converted, then the final name, same file)
    if (a.pdf_path) {
      const { data: pdf } = await admin.storage.from("pdfs").download(a.pdf_path);
      if (pdf) {
        const person = `${a.first_name} ${a.last_name}`.trim();
        const name = a.status === "draft" ? `DRAFT - ${a.order_number} - ${person}.pdf` : `${a.order_number} - ${person}.pdf`;
        pdfFileId = await uploadFile(token, { name, mime: "application/pdf", body: new Uint8Array(await pdf.arrayBuffer()), parent: folderId, fileId: pdfFileId });
      }
    }

    await admin
      .from("assessments")
      .update({ drive_folder_id: folderId, drive_pdf_file_id: pdfFileId, drive_synced_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ ok: true, folderId });
  } catch (e) {
    const msg = e instanceof GoogleAuthError ? e.message : `Google Drive upload failed: ${(e as Error).message}`;
    return NextResponse.json({ ok: false, warning: `${msg} Saved in the app.` });
  }
}
