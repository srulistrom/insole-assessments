import { ImageResponse } from "next/og";
import { getPublicSettings } from "@/lib/public-settings";

export const dynamic = "force-dynamic";

const SIZES = new Set([180, 192, 512]);

/**
 * Home-screen icon: an insole with its arch curve, on the accent colour.
 * Deliberately NOT the shop logo, so this app is easy to tell apart from other Reagle apps on the home screen.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const px = parseInt(raw, 10);
  if (!SIZES.has(px)) return new Response("Not found", { status: 404 });
  const maskable = raw.includes("maskable");

  const s = await getPublicSettings();
  const art = Math.round(px * (maskable ? 0.66 : 0.84)); // maskable icons keep the art inside the safe zone

  return new ImageResponse(
    (
      <div style={{ width: px, height: px, display: "flex", alignItems: "center", justifyContent: "center", background: s.accent_color }}>
        <svg width={art} height={art} viewBox="-6 -6 112 112" xmlns="http://www.w3.org/2000/svg">
          <g transform="rotate(-20 50 50)">
            {/* insole outline: a long sole - wide ball of the foot, narrow arch on the left, round heel */}
            <path
              d="M42 2 C56 0 68 6 69 22 C70 37 63 46 62 58 C61 70 64 82 61 90 C59 97 51 100 45 100 C37 100 33 94 34 86 C35 76 41 68 40 58 C39 47 30 38 30 24 C30 10 34 4 42 2 Z"
              fill={s.primary_color}
            />
            {/* the arch support: curves following the inner arch */}
            <path d="M45 50 C52 58 54 68 51 80" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M54 44 C60 54 61 66 58 77" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        </svg>
      </div>
    ),
    { width: px, height: px, headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
