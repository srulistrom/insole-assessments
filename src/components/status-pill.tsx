import { cn } from "@/lib/utils";
import { STATUS_META, type Status } from "@/lib/types";

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-extrabold ring-1 ring-inset", m.pill, className)}>
      <span className={cn("size-2 rounded-full", m.dot)} />
      {status === "draft" ? "DRAFT - AWAITING DECISION" : m.label}
    </span>
  );
}
