export function money(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return "£" + (Number.isInteger(v) ? v.toString() : v.toFixed(2));
}

export function fmtDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function fullName(a: { first_name: string; last_name: string }) {
  return `${a.first_name} ${a.last_name}`.trim();
}

export function initials(a: { first_name: string; last_name: string }) {
  return `${a.first_name?.[0] ?? ""}${a.last_name?.[0] ?? ""}`.toUpperCase();
}

export function parseMoney(s: string) {
  const v = parseFloat(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

/** Convert a local phone number to WhatsApp international format (digits only). */
export function toIntlPhone(phone: string, countryCode = "44") {
  const p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) return p.slice(1);
  if (p.startsWith("00")) return p.slice(2);
  if (p.startsWith("0")) return countryCode + p.slice(1);
  if (p.startsWith(countryCode)) return p;
  return countryCode + p;
}
