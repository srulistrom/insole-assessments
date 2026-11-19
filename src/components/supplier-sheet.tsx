"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Download, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";
import type { Assessment } from "@/lib/types";
import { supplierMessage } from "@/lib/messages";
import { downloadFoamPhoto, saveBlob } from "@/lib/photos";
import { setStatus } from "@/lib/assessments";
import { useSettings } from "@/components/settings-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const message = supplierMessage(assessment);
  const alreadySent = assessment.status === "sent_to_supplier";

  // Pre-load photos so navigator.share can run inside the tap (required by browsers).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const out: File[] = [];
      for (const [path, name] of [
        [assessment.foam_photo_right_url, "Right.jpg"],
        [assessment.foam_photo_left_url, "Left.jpg"],
      ] as const) {
        if (!path) continue;
        const blob = await downloadFoamPhoto(path);
        if (blob) out.push(new File([blob], `${assessment.order_number}-${name}`, { type: "image/jpeg" }));
      }
      if (!cancelled) setFiles(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, assessment.foam_photo_right_url, assessment.foam_photo_left_url, assessment.order_number]);

  async function markSent() {
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
    toast("WhatsApp opened - attach the photos with Download Photos");
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
    if (!files.length) return toast.error("No photos to download");
    files.forEach((f) => saveBlob(f, f.name));
    toast.success("Photos downloaded");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Send to supplier"
        description={settings.whatsapp_group_name ? `WhatsApp group: ${settings.whatsapp_group_name}` : "Share this order on WhatsApp"}
      >
        <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-background p-4 text-[15px] font-medium leading-relaxed">{message}</pre>
        <div className="mt-5 space-y-3">
          <Button variant="whatsapp" size="lg" className="w-full" onClick={share}>
            <Send /> Share with photos
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={copy}>
              <Copy /> Copy Message
            </Button>
            <Button variant="outline" onClick={downloadPhotos}>
              <Download /> Download Photos
            </Button>
          </div>
          <Button variant="outline" className="w-full" onClick={openGroup}>
            <ExternalLink /> Open WhatsApp Group
          </Button>
          {!alreadySent ? (
            <Button variant="soft" className="w-full" onClick={markSent}>
              <CheckCircle2 /> I've sent it - mark as Sent to Supplier
            </Button>
          ) : (
            <p className="flex items-center justify-center gap-2 pt-1 text-base font-bold text-emerald-700">
              <CheckCircle2 className="size-5" /> Already marked as sent
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
