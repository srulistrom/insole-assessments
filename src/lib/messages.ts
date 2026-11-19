import type { Assessment } from "@/lib/types";
import { money } from "@/lib/format";

export function supplierMessage(a: Assessment) {
  const dash = (v: string | null) => (v && v.trim() ? v.trim() : "-");
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
    `Foam photos attached`,
  ].join("\n");
}

export function readyMessage(a: Assessment) {
  return `Hi ${a.first_name}, your custom insoles (${a.arch_type_name ?? "custom"}) are ready to collect! Balance due: ${money(a.balance_due)}. See you soon!`;
}
