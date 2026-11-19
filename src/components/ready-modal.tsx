"use client";
import { useState } from "react";
import { Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { Assessment } from "@/lib/types";
import { readyMessage } from "@/lib/messages";
import { toIntlPhone } from "@/lib/format";
import { setStatus } from "@/lib/assessments";
import { useSettings } from "@/components/settings-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** "Mark as Arrived" flow: optionally WhatsApp the customer that it's ready. */
export function ReadyModal({
  assessment,
  open,
  onOpenChange,
  onDone,
}: {
  assessment: Assessment;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const { country_code } = useSettings();
  const [busy, setBusy] = useState(false);

  async function go(sendWhatsApp: boolean) {
    setBusy(true);
    // Open the tab synchronously inside the tap so mobile browsers don't block it.
    const win = sendWhatsApp
      ? window.open(`https://wa.me/${toIntlPhone(assessment.phone, country_code)}?text=${encodeURIComponent(readyMessage(assessment))}`, "_blank")
      : null;
    try {
      await setStatus(assessment.id, "arrived");
      toast.success("Marked as Arrived!");
      onOpenChange(false);
      onDone();
    } catch (e) {
      win?.close();
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Insoles arrived" description="Send WhatsApp to customer that it's ready?">
        <p className="mb-5 rounded-2xl bg-background p-4 text-[15px] font-medium leading-relaxed">{readyMessage(assessment)}</p>
        <div className="space-y-3">
          <Button variant="whatsapp" size="lg" className="w-full" loading={busy} onClick={() => go(true)}>
            <MessageCircle /> Yes, Send WhatsApp
          </Button>
          <Button variant="outline" className="w-full" disabled={busy} onClick={() => go(false)}>
            <Check /> No, Just Mark
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
