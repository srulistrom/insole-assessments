"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ArchType, Assessment } from "@/lib/types";
import { fmtDate, fullName, parseMoney } from "@/lib/format";
import { convertDraft } from "@/lib/assessments";
import { useSettings } from "@/components/settings-provider";
import { EMPTY_TERMS, OrderTerms, termsBalance, type Terms } from "@/components/order-terms";
import { Button } from "@/components/ui/button";

export function ConvertForm({ id }: { id: string }) {
  const router = useRouter();
  const settings = useSettings();
  const [a, setA] = useState<Assessment | null>(null);
  const [archTypes, setArchTypes] = useState<ArchType[]>([]);
  const [terms, setTerms] = useState<Terms>(EMPTY_TERMS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.from("assessments").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) return;
      const row = data as Assessment;
      setA(row);
      setTerms({ archId: row.arch_type_id, price: String(row.price || 0), deposit: String(row.deposit_amount || 0), method: row.deposit_payment_method });
    });
    supabase.from("arch_types").select("*").eq("active", true).order("sort_order").order("name").then(({ data }) => data && setArchTypes(data as ArchType[]));
  }, [id]);

  if (!a) return <div className="h-96 animate-pulse rounded-3xl bg-card" />;
  if (a.status !== "draft") {
    return (
      <div className="py-16 text-center">
        <p className="text-xl font-extrabold">This isn't a draft any more.</p>
        <Button asChild className="mt-6">
          <Link href={`/jobs/${id}`}>Back to job</Link>
        </Button>
      </div>
    );
  }

  const arch = archTypes.find((t) => t.id === terms.archId);

  async function save() {
    if (!arch) return toast.error("Choose an arch type");
    if (termsBalance(terms) < 0) return toast.error("Deposit can't be more than the price");
    if (parseMoney(terms.deposit) > 0 && !terms.method) return toast.error("Choose how the deposit was paid");
    setBusy(true);
    try {
      const res = await convertDraft(
        id,
        {
          arch_type_id: arch.id,
          arch_type_name: arch.name,
          price: parseMoney(terms.price),
          deposit_amount: parseMoney(terms.deposit),
          deposit_payment_method: parseMoney(terms.deposit) > 0 ? terms.method : null,
        },
        settings,
      );
      toast.success("Order confirmed!", {
        description: res.assessment.label_printed ? `Label already printed on ${fmtDate(res.assessment.label_printed_at, true)} - no need to print again.` : undefined,
        duration: 6000,
      });
      if (res.driveWarning) toast.warning(res.driveWarning);
      router.replace(`/jobs/${id}?send=1`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="pb-32">
      <Link href={`/jobs/${id}`} className="inline-flex h-11 items-center gap-2 rounded-full pr-4 text-base font-bold text-primary">
        <ArrowLeft className="size-5" /> Back
      </Link>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Customer approved</h1>
      <p className="mb-5 mt-1 text-base font-semibold text-muted">
        {fullName(a)} · {a.order_number}
      </p>

      {a.label_printed && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900">
          <Printer className="mt-0.5 size-6 shrink-0" />
          <p className="text-[15px] font-bold leading-snug">
            Label already printed on {fmtDate(a.label_printed_at, true)} - No need to print again. Use existing label on foam box.
          </p>
        </div>
      )}

      <OrderTerms archTypes={archTypes} methods={settings.payment_methods} value={terms} onChange={setTerms} />

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pt-3 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4">
          <Button size="lg" className="w-full" onClick={save} loading={busy} disabled={!arch}>
            <Check /> Save as Order
          </Button>
        </div>
      </div>
    </div>
  );
}
