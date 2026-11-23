import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

/** Called after settings are saved so the server-side settings cache is refreshed straight away. */
export async function POST() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ ok: false }, { status: 401 });
  revalidateTag("settings");
  return NextResponse.json({ ok: true });
}
