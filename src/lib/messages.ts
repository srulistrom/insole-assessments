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
