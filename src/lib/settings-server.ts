import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_SETTINGS, mergeSettings, type AppSettings } from "@/lib/settings";

type Row = { key: string; value: unknown; is_public: boolean };

async function fetchRows(): Promise<Row[]> {
  try {
    const { data, error } = await supabaseAdmin().from("settings").select("key,value,is_public");
    if (error) throw new Error(error.message);
    return (data ?? []) as Row[];
  } catch {
    // No service key available: fall back to the public branding rows only.
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await anon.from("settings").select("key,value");
    return ((data ?? []) as { key: string; value: unknown }[]).map((r) => ({ ...r, is_public: true }));
  }
}

/**
 * Settings are read from a server-side cache instead of the database on every page load
 * (that lookup was repeated on every tap). The cache is cleared when settings are saved
 * (see /api/settings/revalidate) and otherwise refreshes every 5 minutes.
 */
const loadRows = unstable_cache(fetchRows, ["settings-rows-v1"], { tags: ["settings"], revalidate: 300 });

/** Signed-in staff get every setting; visitors on the sign-in page only get the public branding. */
export async function getSettings(opts: { signedIn: boolean }): Promise<AppSettings> {
  try {
    const rows = await loadRows();
    return mergeSettings(opts.signedIn ? rows : rows.filter((r) => r.is_public));
  } catch (e) {
    console.error("[settings] could not load:", (e as Error).message);
    return DEFAULT_SETTINGS;
  }
}
