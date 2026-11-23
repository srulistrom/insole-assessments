import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { exchangeCode, siteUrl } from "@/lib/google";

export async function GET(req: Request) {
  const base = siteUrl(req);
  const back = (q: string) => {
    const res = NextResponse.redirect(`${base}/settings?${q}`);
    res.cookies.delete({ name: "g_oauth_state", path: "/api/google" });
    return res;
  };

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.redirect(`${base}/login`);

  const url = new URL(req.url);
  if (url.searchParams.get("error")) return back("drive=denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = (await cookies()).get("g_oauth_state")?.value;
  if (!code || !state || !expected || state !== expected) return back("drive=bad_state");

  try {
    const tokens = await exchangeCode(code, req);
    const admin = supabaseAdmin();

    const { data: existing } = await admin.from("integrations").select("data").eq("provider", "google").maybeSingle();
    const refresh = tokens.refresh_token ?? existing?.data?.refresh_token;
    if (!refresh) return back("drive=no_refresh");

    let email: string | undefined;
    try {
      const info = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      email = (await info.json()).email;
    } catch {
      /* email is cosmetic */
    }

    await admin.from("integrations").upsert({ provider: "google", data: { refresh_token: refresh, email }, updated_at: new Date().toISOString() });
    await admin.from("settings").upsert({ key: "google_drive", value: { connected: true, email, connected_at: new Date().toISOString() }, is_public: false });
    revalidateTag("settings");
    return back("drive=connected");
  } catch {
    return back("drive=error");
  }
}
