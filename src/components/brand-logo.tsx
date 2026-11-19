"use client";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/settings-provider";

/**
 * Shop logo from settings, or a friendly "YOUR LOGO" placeholder until one is uploaded.
 * If transparent light/dark versions exist they are used so the logo sits directly on the surface
 * (light version on coloured backgrounds, dark version on white); otherwise the original image is shown.
 */
export function BrandLogo({ className, onDark }: { className?: string; onDark?: boolean }) {
  const { logo_url, logo_light_url, logo_dark_url, shop_name } = useSettings();
  const variant = onDark ? logo_light_url : logo_dark_url;
  const src = variant ?? logo_url;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={shop_name || "Logo"} className={cn("object-contain", !variant && "rounded-2xl", className)} />;
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
