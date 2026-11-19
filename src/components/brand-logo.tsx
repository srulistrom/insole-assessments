"use client";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/settings-provider";

/** Shop logo from settings, or a friendly "YOUR LOGO" placeholder until one is uploaded. */
export function BrandLogo({ className, onDark }: { className?: string; onDark?: boolean }) {
  const { logo_url, shop_name } = useSettings();
  if (logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo_url} alt={shop_name || "Logo"} className={cn("rounded-2xl object-contain", className)} />;
  }
  return (
    <div
      className={cn(
        "grid place-items-center rounded-2xl border-2 border-dashed text-center text-[10px] font-extrabold leading-tight tracking-widest",
        onDark ? "border-white/40 bg-white/10 text-white/80" : "border-primary/30 bg-primary/5 text-primary/70",
        className,
      )}
      aria-label="Logo placeholder"
    >
      YOUR
      <br />
      LOGO
    </div>
  );
}
