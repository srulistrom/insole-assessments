import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: integ } = await admin.from("integrations").select("data").eq("provider", "google").maybeSingle();
  const refresh = integ?.data?.refresh_token;
  if (refresh) {
    // Best effort: tell Google to revoke the grant.
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refresh }),
    }).catch(() => {});
  }
  await admin.from("integrations").delete().eq("provider", "google");
  await admin.from("settings").upsert({ key: "google_drive", value: { connected: false }, is_public: false });
  return NextResponse.json({ ok: true });
}
