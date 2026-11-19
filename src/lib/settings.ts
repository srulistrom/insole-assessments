export interface AppSettings {
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  primary_color: string;
  accent_color: string;
  logo_url: string | null;
  /** Optional transparent versions of the logo: light artwork for coloured surfaces, dark artwork for white. */
  logo_light_url: string | null;
  logo_dark_url: string | null;
  field_email: boolean;
  field_notes: boolean;
  field_issue: boolean;
  field_shoe_size: boolean;
  /** Which size system the shoe-size picker opens on. */
  shoe_size_default: "UK" | "EU";
  whatsapp_group_link: string;
  whatsapp_group_name: string;
  country_code: string;
  assessor_pin_enabled: boolean;
  payment_methods: string[];
  google_drive: { connected: boolean; email?: string; connected_at?: string };
}

export const DEFAULT_SETTINGS: AppSettings = {
  shop_name: "",
  shop_address: "",
  shop_phone: "",
  primary_color: "#0F2A5C",
  accent_color: "#E8B84B",
  logo_url: null,
  logo_light_url: null,
  logo_dark_url: null,
  field_email: true,
  field_notes: true,
  field_issue: true,
  field_shoe_size: true,
  shoe_size_default: "UK",
  whatsapp_group_link: "",
  whatsapp_group_name: "",
  country_code: "44",
  assessor_pin_enabled: false,
  payment_methods: ["Cash", "Card", "Bank Transfer"],
  google_drive: { connected: false },
};

export function mergeSettings(rows: { key: string; value: unknown }[] | null | undefined): AppSettings {
  const out: AppSettings = { ...DEFAULT_SETTINGS };
  for (const row of rows ?? []) {
    if (row.key in out && row.value !== undefined) {
      (out as unknown as Record<string, unknown>)[row.key] = row.value;
    }
  }
  if (!Array.isArray(out.payment_methods) || out.payment_methods.length === 0) {
    out.payment_methods = DEFAULT_SETTINGS.payment_methods;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(out.primary_color)) out.primary_color = DEFAULT_SETTINGS.primary_color;
  if (!/^#[0-9a-fA-F]{6}$/.test(out.accent_color)) out.accent_color = DEFAULT_SETTINGS.accent_color;
  return out;
}
