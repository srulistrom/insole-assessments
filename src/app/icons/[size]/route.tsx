import { ImageResponse } from "next/og";
import { getPublicSettings } from "@/lib/public-settings";
import { readableOn } from "@/lib/color";

export const dynamic = "force-dynamic";

const SIZES = new Set([180, 192, 512]);

async function toDataUrl(url: string | null) {
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

/**
 * Home-screen icon: the Reagle logo floating above a hand-sketched arched insole.
 * The sketch starts at the heel and is deliberately left unfinished: the pencil lines are strong at the heel and arch,
 * then thin out and fade about three-quarters of the way along, with only a very faint guide for the rest.
 * The insole is what tells this app apart from other Reagle apps on the home screen.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const px = parseInt(raw, 10);
  if (!SIZES.has(px)) return new Response("Not found", { status: 404 });
  const maskable = raw.includes("maskable");

  const s = await getPublicSettings();
  const logo = await toDataUrl(s.logo_light_url); // white + gold artwork for the dark tile
  const w = Math.round(px * (maskable ? 0.56 : 0.74)); // maskable icons keep everything inside the safe zone
  const logoH = Math.round(w * 0.694); // logo artwork is 1248 x 866
  const insoleH = Math.round(w * (94 / 262));
  const gap = Math.round(w * 0.03);
  const gold = s.accent_color;
  const ice = "#a8cdf2"; // light blue pencil for the base layer

  return new ImageResponse(
    (
      <div
        style={{
          width: px,
          height: px,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(160deg, ${s.primary_color} 0%, #06264a 100%)`,
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" width={w} height={logoH} style={{ objectFit: "contain" }} />
        ) : (
          <div style={{ display: "flex", height: logoH, alignItems: "center", fontSize: Math.round(w * 0.3), fontWeight: 800, color: readableOn(s.primary_color) }}>
            {(s.shop_name.trim()[0] ?? "R").toUpperCase()}
          </div>
        )}

        <svg width={w} height={insoleH} viewBox="0 0 262 94" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: gap }}>
          <defs>
            {/* the pencil lifts: full strength at the heel and arch, fading out toward the toe */}
            <linearGradient id="fadeGold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="262" y2="0">
              <stop offset="0" stopColor={gold} stopOpacity="1" />
              <stop offset="0.6" stopColor={gold} stopOpacity="1" />
              <stop offset="0.76" stopColor={gold} stopOpacity="0.55" />
              <stop offset="0.86" stopColor={gold} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="fadeIce" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="262" y2="0">
              <stop offset="0" stopColor={ice} stopOpacity="1" />
              <stop offset="0.55" stopColor={ice} stopOpacity="1" />
              <stop offset="0.72" stopColor={ice} stopOpacity="0.5" />
              <stop offset="0.82" stopColor={ice} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="fadeFill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="262" y2="0">
              <stop offset="0" stopColor={gold} stopOpacity="0.22" />
              <stop offset="0.5" stopColor={gold} stopOpacity="0.2" />
              <stop offset="0.74" stopColor={gold} stopOpacity="0" />
            </linearGradient>
          </defs>

          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* colour tint, a little off the outline like a marker that slipped, fading out with the lines */}
            <path
              d="M11 54 C33 51 58 48 87 34 C111 21 141 16 165 27 C188 38 213 48 237 46 C251 45 258 54 253 61 C247 68 226 67 204 63 C171 57 140 55 112 58 C84 61 57 71 31 68 C19 66 12 61 11 54 Z"
              fill="url(#fadeFill)"
              stroke="none"
              transform="translate(2.4 2.2)"
            />

            {/* ---- base layer (light-blue pencil): starts at the heel, trails off ---- */}
            <path d="M9 64 C31 79 59 80 87 74 C113 68 143 67 181 72 C196 74 208 75 218 74" stroke="url(#fadeIce)" strokeWidth="3.6" />
            <path d="M9 64 C31 79 59 80 87 74 C113 68 143 67 181 72" stroke="url(#fadeIce)" strokeOpacity="0.45" strokeWidth="1.5" transform="translate(-1.4 1.6)" strokeDasharray="70 5 60" />
            <path d="M9 65 C11 79 27 89 53 88 C81 87 108 83 141 85 C160 86 180 87 198 86" stroke="url(#fadeIce)" strokeWidth="4.2" />
            <path d="M58 87 C92 85 132 87 168 88" stroke="url(#fadeIce)" strokeOpacity="0.5" strokeWidth="1.8" />

            {/* ---- arch layer (gold pencil): heavy at the heel and arch, thinning as it goes ---- */}
            <path d="M8 48 L11 54 C33 51 58 48 87 34" stroke={gold} strokeWidth="4.8" /> {/* heel, pressed hard */}
            <path d="M88 33 C111 21 141 16 165 27" stroke={gold} strokeWidth="6.4" /> {/* crest */}
            <path d="M165 27 C188 38 204 44 220 46" stroke="url(#fadeGold)" strokeWidth="3.2" />
            <path d="M11 54 C33 51 58 48 87 34 C111 21 141 16 165 27" stroke="url(#fadeGold)" strokeOpacity="0.45" strokeWidth="1.6" transform="translate(1.8 -1.6)" strokeDasharray="120 6 60" />

            <path d="M8 48 L9 53 C12 61 19 66 31 68 C57 71 84 61 112 58" stroke={gold} strokeWidth="4.2" />
            <path d="M112 58 C140 55 171 57 204 63" stroke="url(#fadeGold)" strokeWidth="3.6" />
            <path d="M9 53 C12 61 19 66 31 68 C57 71 84 61 112 58" stroke={gold} strokeOpacity="0.4" strokeWidth="1.6" transform="translate(-1.5 1.7)" strokeDasharray="90 7 60" />

            {/* loose contour strokes across the arch (only on the finished part) */}
            <path d="M64 50 C90 36 122 29 152 35" stroke="url(#fadeGold)" strokeWidth="2.6" strokeOpacity="0.9" />
            <path d="M55 56 C88 45 118 41 150 47" stroke="url(#fadeGold)" strokeWidth="2.1" strokeOpacity="0.6" strokeDasharray="62 8 30" />
            <path d="M110 33 C126 28 141 30 150 35" stroke="#f6dc8e" strokeWidth="1.9" strokeOpacity="0.8" />

            {/* quick hatching under the arch, stopping where the drawing stops */}
            <path d="M92 56 l-5 7 M104 54 l-5 8 M116 54.5 l-4 7 M129 54 l-5 8 M142 55 l-4 7" stroke={gold} strokeWidth="1.8" strokeOpacity="0.6" />

            {/* the unfinished part: only a very faint pencil guide for the wide, round toe end */}
            <g strokeDasharray="2 7" strokeOpacity="0.2" strokeWidth="2">
              <path d="M220 46 C240 45 253 52 253 61 C250 68 232 67 204 63" stroke={gold} />
              <path d="M218 74 C238 76 254 72 258 63 C262 72 252 84 235 85 C222 87 210 87 198 86" stroke={ice} />
            </g>

            {/* a few short ground strokes underneath, so it seems to float */}
            <path d="M48 92 L80 91 M101 92.5 L160 91.5" stroke="#ffffff" strokeOpacity="0.26" strokeWidth="2" />
          </g>
        </svg>
      </div>
    ),
    { width: px, height: px, headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
