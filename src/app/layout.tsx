import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { supabaseServer } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, mergeSettings } from "@/lib/settings";
import { themeCss } from "@/lib/color";
import { SettingsProvider } from "@/components/settings-provider";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insole Assessments",
  description: "Custom insole and arch assessments",
  appleWebApp: { capable: true, title: "Insoles", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A3A6E",
};

async function loadSettings() {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.from("settings").select("key,value");
    if (error) console.error("[settings] could not load:", error.message);
    return mergeSettings(data);
  } catch (e) {
    console.error("[settings] could not load:", (e as Error).message, (e as { cause?: unknown }).cause);
    return DEFAULT_SETTINGS;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await loadSettings();
  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss(settings.primary_color, settings.accent_color) }} />
      </head>
      <body className="min-h-dvh antialiased">
        <SettingsProvider settings={settings}>{children}</SettingsProvider>
        <Toaster position="top-center" richColors closeButton={false} toastOptions={{ className: "!rounded-2xl !text-base !font-semibold" }} />
      </body>
    </html>
  );
}
