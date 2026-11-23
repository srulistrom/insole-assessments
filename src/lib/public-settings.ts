import { getSettings } from "@/lib/settings-server";
import type { AppSettings } from "@/lib/settings";

/** Branding settings readable without a login (manifest + icons are fetched by the browser without cookies). */
export async function getPublicSettings(): Promise<AppSettings> {
  return getSettings({ signedIn: false });
}
