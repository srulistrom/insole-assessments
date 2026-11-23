import type { MetadataRoute } from "next";
import { getPublicSettings } from "@/lib/public-settings";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getPublicSettings();
  // Version the icon URLs so a changed colour is picked up by installed copies.
  const v = encodeURIComponent(`2-${s.primary_color}${s.accent_color}`);
  return {
    id: "/jobs",
    name: s.shop_name ? `${s.shop_name} Insoles` : "Insole Assessments",
    short_name: "Insoles",
    description: "Custom insole and arch assessments",
    start_url: "/jobs",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: s.primary_color,
    icons: [
      { src: `/icons/192?v=${v}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icons/512?v=${v}`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/icons/512-maskable?v=${v}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
