"use client";
import { createContext, useContext } from "react";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";

const Ctx = createContext<AppSettings>(DEFAULT_SETTINGS);

export function SettingsProvider({ settings, children }: { settings: AppSettings; children: React.ReactNode }) {
  return <Ctx.Provider value={settings}>{children}</Ctx.Provider>;
}

export function useSettings() {
  return useContext(Ctx);
}
