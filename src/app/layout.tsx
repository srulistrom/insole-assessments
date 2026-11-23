import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { supabaseServer } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings-server";
import { themeCss } from "@/lib/color";
import { getPublicSettings } from "@/lib/public-settings";
import { SettingsProvider } from "@/components/settings-provider";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insole Assessments",
  description: "Custom insole and arch assessments",
  appleWebApp: { capable: true, title: "Insoles", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/192", sizes: "192x192", type: "image/png" },
      { url: "/icons/512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/180", sizes: "180x180", type: "image/png" }],
  },
};

export async function generateViewport(): Promise<Viewport> {
  const s = await getPublicSettings();
  return { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: s.primary_color };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Is someone signed in? getClaims checks the sign-in cookie locally (no database round trip), then the
  // settings come from a server cache rather than the database on every page.
  let signedIn = false;
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getClaims();
    signedIn = !!data?.claims;
  } catch {
    signedIn = false;
  }
  const settings = await getSettings({ signedIn });
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
