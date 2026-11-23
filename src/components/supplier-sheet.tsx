"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Download, ExternalLink, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { photoPaths, pictureFileName, type Assessment } from "@/lib/types";
import { supplierMessage } from "@/lib/messages";
import { downloadFoamPhoto, saveBlob } from "@/lib/photos";
import { setStatus } from "@/lib/assessments";
import { useSettings } from "@/components/settings-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Share an order with the supplier on WhatsApp. For a DRAFT (no arch type yet) the message is an
 * "opinion needed" request that says clearly it is not a confirmed order, and the status is left alone.
 */
export function SupplierSheet({
  assessment,
  open,
  onOpenChange,
  onSent,
}: {
  assessment: Assessment;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSent?: () => void;
}) {
  const settings = useSettings();
  const [files, setFiles] = useState<File[]>([]);
  const isOpinion = assessment.status === "draft";
  const message = supplierMessage(assessment);
  const alreadySent = assessment.status === "sent_to_supplier";
  const paths = photoPaths(assessment).join("|");

  // Pre-load photos so navigator.share can run inside the tap (required by browsers).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const out: File[] = [];
      for (const path of paths ? paths.split("|") : []) {
        const blob = await downloadFoamPhoto(path);
        if (blob) out.push(new File([blob], `${assessment.order_number}-${pictureFileName(path)}`.replace(/\s+/g, "-"), { type: "image/jpeg" }));
      }
      if (!cancelled) setFiles(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, paths, assessment.order_number]);

  async function markSent() {
    if (isOpinion) {
      toast.success("Sent!", { description: "Opinion request shared - the draft stays as a draft" });
      return;
    }
    if (alreadySent) return;
    try {
      await setStatus(assessment.id, "sent_to_supplier");
      toast.success("Sent!", { description: "Marked as Sent to Supplier" });
      onSent?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy - press and hold the text to copy it");
    }
  }

  async function share() {
    const data: ShareData = { text: message, title: assessment.order_number };
    if (files.length && navigator.canShare?.({ files })) data.files = files;
    try {
      if (navigator.share) {
        await navigator.share(data);
        await markSent();
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    // Fallback: no Web Share (desktop / old browser)
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    toast("WhatsApp opened - attach the pictures with Download Pictures");
  }

  function openGroup() {
    const link = settings.whatsapp_group_link?.trim();
    if (!link) {
      toast.error("No WhatsApp group link yet", { description: "Add it in Settings > WhatsApp Group." });
      return;
    }
    copy();
    window.open(link, "_blank");
  }

  function downloadPhotos() {
    if (!files.length) return toast.error("No pictures to download");
    files.forEach((f) => saveBlob(f, f.name));
    toast.success("Pictures downloaded");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={isOpinion ? "Ask supplier's opinion" : "Send to supplier"}
        description={settings.whatsapp_group_name ? `WhatsApp group: ${settings.whatsapp_group_name}` : "Share this on WhatsApp"}
      >
        {isOpinion && (
          <p className="mb-4 flex items-start gap-2.5 rounded-2xl bg-amber-50 p-4 text-[15px] font-bold leading-snug text-amber-900">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            This is not an order. The message tells the supplier no arch type is chosen and asks which one to use. Nothing is confirmed.
          </p>
        )}
        <pre dir="auto" className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-background p-4 text-[15px] font-medium leading-relaxed">{message}</pre>
        <div className="mt-5 space-y-3">
          <Button variant="whatsapp" size="lg" className="w-full" onClick={share}>
            <Send /> Share with pictures
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={copy}>
              <Copy /> Copy Message
            </Button>
            <Button variant="outline" onClick={downloadPhotos}>
              <Download /> Download Pictures
            </Button>
          </div>
          <Button variant="outline" className="w-full" onClick={openGroup}>
            <ExternalLink /> Open WhatsApp Group
          </Button>
          {!isOpinion && !alreadySent && (
            <Button variant="soft" className="w-full" onClick={markSent}>
              <CheckCircle2 /> I've sent it - mark as Sent to Supplier
            </Button>
          )}
          {!isOpinion && alreadySent && (
            <p className="flex items-center justify-center gap-2 pt-1 text-base font-bold text-emerald-700">
              <CheckCircle2 className="size-5" /> Already marked as sent
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
