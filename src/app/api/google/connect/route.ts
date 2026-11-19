import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { GOOGLE_SCOPES, redirectUri, siteUrl } from "@/lib/google";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.redirect(`${siteUrl(req)}/login`);

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${siteUrl(req)}/settings?drive=not_configured`);
  }

  const state = randomBytes(24).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // always returns a refresh token
    include_granted_scopes: "true",
    state,
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set("g_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/api/google" });
  return res;
}
