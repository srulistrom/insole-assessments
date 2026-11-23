"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ImageIcon, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/photos";
import { Button } from "@/components/ui/button";

export function FoamPhotoCard({
  label,
  blob,
  onChange,
  onRemove,
}: {
  label: string;
  blob: Blob | null;
  onChange: (b: Blob | null) => void;
  /** Extra pictures can be removed; Picture 1 and 2 cannot. */
  onRemove?: () => void;
}) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!blob) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onChange(await compressImage(file));
      toast.success("Picture added");
    } catch {
      toast.error("That photo could not be read - try another");
    } finally {
      setBusy(false);
    }
  }

  const done = !!blob;
  return (
    <div className={cn("overflow-hidden rounded-3xl border-2 bg-card shadow-soft transition-colors", done ? "border-emerald-500" : "border-line")}>
      <div className="flex items-center justify-between px-5 pt-4">
        <h3 className="text-xl font-extrabold tracking-tight">{label}</h3>
        <div className="flex items-center gap-2">
          {done && <CheckCircle2 className="animate-pop size-8 text-emerald-600" />}
          {onRemove && (
            <button type="button" onClick={onRemove} className="grid size-11 place-items-center rounded-full text-red-600 active:bg-red-50" aria-label={`Remove ${label}`}>
              <Trash2 className="size-6" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-primary/5">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={label} className="size-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-primary/50">
              <Camera className="size-16" strokeWidth={1.5} />
              <span className="text-sm font-bold">{busy ? "Processing…" : "No photo yet"}</span>
            </div>
          )}
        </div>

        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
        <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={pick} />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button size="lg" variant={done ? "outline" : "default"} onClick={() => camRef.current?.click()} loading={busy}>
            {done ? <RotateCcw /> : <Camera />} {done ? "Retake" : "Take Photo"}
          </Button>
          <Button size="lg" variant="outline" onClick={() => galRef.current?.click()} disabled={busy}>
            <ImageIcon /> Gallery
          </Button>
        </div>
      </div>
    </div>
  );
}
