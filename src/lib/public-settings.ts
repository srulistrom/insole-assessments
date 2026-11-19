import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, mergeSettings, type AppSettings } from "@/lib/settings";

/** Branding settings readable without a login (manifest + icons are fetched by the browser without cookies). */
export async function getPublicSettings(): Promise<AppSettings> {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase.from("settings").select("key,value");
    return mergeSettings(data);
  } catch {
    return DEFAULT_SETTINGS;
  }
}
