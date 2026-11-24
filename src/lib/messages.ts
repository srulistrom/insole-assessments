import { photoPaths, type Assessment } from "@/lib/types";
import { money } from "@/lib/format";

/**
 * The one line of the supplier message that is written in Hebrew when the arch type hasn't been chosen:
 * "Arch type: not chosen yet - waiting for your reply on which arch suits the customer".
 */
export const ARCH_NOT_CHOSEN_HEBREW = "סוג קשת: טרם נבחר - ממתינים לתשובתך איזה סוג קשת מתאים ללקוח";

const dash = (v: string | null) => (v && v.trim() ? v.trim() : "-");

export function supplierMessage(a: Assessment) {
  const pics = photoPaths(a).length;
  const attached = pics > 2 ? `Foam pictures attached (${pics})` : "Foam pictures attached";

  // A draft has no arch type yet: this is a request for the supplier's opinion, NOT an order.
  if (a.status === "draft") {
    return [
      "⚠️ NOT A CONFIRMED ORDER - OPINION NEEDED ⚠️",
      `Ref: ${a.order_number}`,
      `Name: ${a.first_name} ${a.last_name}`,
      `Phone: ${a.phone}`,
      `Shoe Size: ${dash(a.shoe_size)}`,
      `Issue: ${dash(a.issue)}`,
      `Notes: ${dash(a.notes)}`,
      `Assessor: ${dash(a.assessor_name)}`,
      ARCH_NOT_CHOSEN_HEBREW,
      attached,
    ].join("\n");
  }

  return [
    `NEW INSOLE ORDER - ${a.order_number}`,
    `Name: ${a.first_name} ${a.last_name}`,
    `Phone: ${a.phone}`,
    `Shoe Size: ${dash(a.shoe_size)}`,
    `Issue: ${dash(a.issue)}`,
    `Notes: ${dash(a.notes)}`,
    `Type: ${a.arch_type_name ?? "-"} - ${money(a.price)}`,
    `Deposit: ${money(a.deposit_amount)} (${a.deposit_payment_method ?? "-"}) - Balance: ${money(a.balance_due)}`,
    `Assessor: ${dash(a.assessor_name)}`,
    attached,
  ].join("\n");
}

export function readyMessage(a: Assessment) {
  return `Hi ${a.first_name}, your custom insoles (${a.arch_type_name ?? "custom"}) are ready to collect! Balance due: ${money(a.balance_due)}. See you soon!`;
}

/* ------------------------------------------------------------------ */
/* Edited orders                                                       */
/* ------------------------------------------------------------------ */

export interface Change {
  key: string;
  label: string;
  labelHe: string;
  from: string;
  to: string;
}

/** Every field the supplier cares about, compared before and after an edit. */
export function computeChanges(before: Assessment, after: Assessment): Change[] {
  const out: Change[] = [];
  const add = (key: string, label: string, labelHe: string, from: string, to: string) => {
    if (from !== to) out.push({ key, label, labelHe, from, to });
  };
  add("name", "Name", "שם", `${before.first_name} ${before.last_name}`.trim(), `${after.first_name} ${after.last_name}`.trim());
  add("phone", "Phone", "טלפון", dash(before.phone), dash(after.phone));
  add("shoe", "Shoe size", "מידת נעל", dash(before.shoe_size), dash(after.shoe_size));
  add("issue", "Issue", "בעיה", dash(before.issue), dash(after.issue));
  add("notes", "Notes", "הערות", dash(before.notes), dash(after.notes));
  add("arch", "Arch type", "סוג קשת", dash(before.arch_type_name), dash(after.arch_type_name));
  add("price", "Price", "מחיר", money(before.price), money(after.price));
  add("deposit", "Deposit", "מקדמה", money(before.deposit_amount), money(after.deposit_amount));
  add("method", "Deposit paid by", "אמצעי תשלום למקדמה", dash(before.deposit_payment_method), dash(after.deposit_payment_method));
  return out;
}

/**
 * Message for an order that was edited after the supplier already had it.
 * The regular English update comes first; the same update in Hebrew follows it (in addition, not instead).
 * Field names and the wording are translated; names, numbers and anything typed in by hand stay exactly as typed.
 */
export function editMessage(a: Assessment, changes: Change[]) {
  const name = `${a.first_name} ${a.last_name}`.trim();
  const method = a.deposit_payment_method ?? "-";

  const english = [
    `✏️ ORDER UPDATED - ${a.order_number}`,
    `Name: ${name}`,
    "",
    "What changed:",
    ...changes.map((c) => `• ${c.label}: ${c.from} → ${c.to}`),
    "",
    "Order now:",
    `Type: ${a.arch_type_name ?? "-"} - ${money(a.price)}`,
    `Deposit: ${money(a.deposit_amount)} (${method}) - Balance: ${money(a.balance_due)}`,
    `Phone: ${a.phone}`,
    `Shoe Size: ${dash(a.shoe_size)}`,
    `Issue: ${dash(a.issue)}`,
    `Notes: ${dash(a.notes)}`,
    "",
    "Please update this order accordingly.",
  ];

  const hebrew = [
    `✏️ ההזמנה עודכנה - ${a.order_number}`,
    `שם: ${name}`,
    "",
    "מה השתנה:",
    ...changes.map((c) => `• ${c.labelHe}: היה ${c.from} | עכשיו ${c.to}`),
    "",
    "ההזמנה כעת:",
    `סוג: ${a.arch_type_name ?? "-"} - ${money(a.price)}`,
    `מקדמה: ${money(a.deposit_amount)} (${method}) - יתרה לתשלום: ${money(a.balance_due)}`,
    `טלפון: ${a.phone}`,
    `מידת נעל: ${dash(a.shoe_size)}`,
    `בעיה: ${dash(a.issue)}`,
    `הערות: ${dash(a.notes)}`,
    "",
    "אנא עדכנו את ההזמנה בהתאם.",
  ];

  return [...english, "", "──────────", "", ...hebrew].join("\n");
}
