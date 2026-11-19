import { ImageResponse } from "next/og";
import { getPublicSettings } from "@/lib/public-settings";
import { readableOn } from "@/lib/color";

export const dynamic = "force-dynamic";

const SIZES = new Set([180, 192, 512]);

async function logoDataUrl(url: string | null) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    if (!type.startsWith("image/")) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Home-screen icon built from the shop branding: logo on a white tile, or the shop's initial. */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const px = parseInt(raw, 10);
  if (!SIZES.has(px)) return new Response("Not found", { status: 404 });
  const maskable = raw.includes("maskable");

  const s = await getPublicSettings();
  const logo = await logoDataUrl(s.logo_dark_url ?? s.logo_url);
  const tile = Math.round(px * (maskable ? 0.62 : 0.74));
  const initial = (s.shop_name.trim()[0] ?? "I").toUpperCase();

  return new ImageResponse(
    (
      <div style={{ width: px, height: px, display: "flex", alignItems: "center", justifyContent: "center", background: s.primary_color }}>
        <div
          style={{
            width: tile,
            height: tile,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: logo ? "#ffffff" : s.accent_color,
            borderRadius: Math.round(tile * 0.22),
            overflow: "hidden",
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" width={Math.round(tile * 0.86)} height={Math.round(tile * 0.86)} style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", fontSize: Math.round(tile * 0.62), fontWeight: 800, color: readableOn(s.accent_color) }}>{initial}</div>
          )}
        </div>
      </div>
    ),
    { width: px, height: px, headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
