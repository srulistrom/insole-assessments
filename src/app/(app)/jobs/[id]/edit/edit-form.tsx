"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ArchType, Assessment } from "@/lib/types";
import { fullName, money, parseMoney } from "@/lib/format";
import { finalizeFiles } from "@/lib/assessments";
import { computeChanges, type Change } from "@/lib/messages";
import { patchJobCache } from "@/lib/jobs-cache";
import { useSettings } from "@/components/settings-provider";
import { EMPTY_TERMS, OrderTerms, termsBalance, type Terms } from "@/components/order-terms";
import { ShoeSizePicker } from "@/components/shoe-size-picker";
import { SupplierSheet } from "@/components/supplier-sheet";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";

interface Form {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  shoe_size: string;
  issue: string;
  notes: string;
}

/** Edit a confirmed order. Save quietly, or save and tell the supplier what changed. */
export function EditForm({ id }: { id: string }) {
  const router = useRouter();
  const settings = useSettings();
  const [orig, setOrig] = useState<Assessment | null>(null);
  const [missing, setMissing] = useState(false);
  const [archTypes, setArchTypes] = useState<ArchType[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [terms, setTerms] = useState<Terms>(EMPTY_TERMS);
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<{ assessment: Assessment; changes: Change[] | undefined } | null>(null);
  const [sheet, setSheet] = useState(false);
  const initialised = useRef(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase
      .from("assessments")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return setMissing(true);
        if (initialised.current) return;
        initialised.current = true;
        const a = data as Assessment;
        setOrig(a);
        setForm({
          first_name: a.first_name,
          last_name: a.last_name,
          phone: a.phone,
          email: a.email ?? "",
          shoe_size: a.shoe_size ?? "",
          issue: a.issue ?? "",
          notes: a.notes ?? "",
        });
        setTerms({ archId: a.arch_type_id, price: String(a.price ?? 0), deposit: String(a.deposit_amount ?? 0), method: a.deposit_payment_method });
      });
    supabase
      .from("arch_types")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("name")
      .then(({ data }) => data && setArchTypes(data as ArchType[]));
  }, [id]);

  if (missing) return <p className="py-20 text-center text-lg font-bold">Job not found.</p>;
  if (!orig || !form) return <div className="h-96 animate-pulse rounded-3xl bg-card" />;
  if (orig.status === "draft" || orig.status === "cancelled") {
    return (
      <div className="py-16 text-center">
        <p className="text-xl font-extrabold">{orig.status === "draft" ? "Drafts are changed by converting them to an order." : "A cancelled order can't be edited."}</p>
        <Button asChild className="mt-6">
          <Link href={`/jobs/${id}`}>Back to job</Link>
        </Button>
      </div>
    );
  }

  const patch = (p: Partial<Form>) => setForm((f) => (f ? { ...f, ...p } : f));
  const arch = archTypes.find((t) => t.id === terms.archId);
  const firstSend = orig.status === "new"; // the supplier hasn't seen this order yet: send it in full, not as an update

  async function save(sendToSupplier: boolean) {
    if (!form || !orig) return;
    if (!form.first_name.trim() || !form.last_name.trim()) return toast.error("Name is required");
    if (form.phone.replace(/\D/g, "").length < 6) return toast.error("Enter a valid phone number");
    const archId = arch?.id ?? orig.arch_type_id;
    const archName = arch?.name ?? orig.arch_type_name;
    if (!archName) return toast.error("Choose an arch type");
    if (termsBalance(terms) < 0) return toast.error("Deposit can't be more than the price");
    if (parseMoney(terms.deposit) > 0 && !terms.method) return toast.error("Choose how the deposit was paid");

    setBusy("Saving…");
    try {
      const { error } = await supabaseBrowser()
        .from("assessments")
        .update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          shoe_size: form.shoe_size.trim() || null,
          issue: form.issue.trim() || null,
          notes: form.notes.trim() || null,
          arch_type_id: archId,
          arch_type_name: archName,
          price: parseMoney(terms.price),
          deposit_amount: parseMoney(terms.deposit),
          deposit_payment_method: parseMoney(terms.deposit) > 0 ? terms.method : null,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);

      setBusy("Updating the PDF…");
      const res = await finalizeFiles(id, settings); // rebuild the PDF and refresh Google Drive with the new details
      patchJobCache(res.assessment);
      if (res.driveWarning) toast.warning(res.driveWarning);
      const changes = computeChanges(orig, res.assessment);

      if (!sendToSupplier) {
        toast.success("Changes saved!", { description: changes.length ? `${changes.length} thing${changes.length === 1 ? "" : "s"} updated` : "Nothing was different" });
        router.replace(`/jobs/${id}`);
        return;
      }
      if (!firstSend && changes.length === 0) {
        toast("Nothing changed", { description: "There is nothing new to tell the supplier." });
        router.replace(`/jobs/${id}`);
        return;
      }
      toast.success("Changes saved!");
      setSent({ assessment: res.assessment, changes: firstSend ? undefined : changes });
      setSheet(true);
      setBusy(null);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="pb-48">
      <Link href={`/jobs/${id}`} className="inline-flex h-11 items-center gap-2 rounded-full pr-4 text-base font-bold text-primary">
        <ArrowLeft className="size-5" /> Back
      </Link>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight">Edit order</h1>
          <p className="mt-1 break-words text-base font-semibold text-muted">
            {orig.order_number} · {fullName(orig)} · {orig.arch_type_name ?? "-"} {money(orig.price)}
          </p>
        </div>
        <StatusPill status={orig.status} className="self-start" />
      </div>

      <section className="mt-6 space-y-5">
        <h2 className="text-xl font-extrabold tracking-tight">Customer</h2>
        <Field label="First name" required>
          <Input autoComplete="off" autoCapitalize="words" value={form.first_name} onChange={(e) => patch({ first_name: e.target.value })} />
        </Field>
        <Field label="Last name" required>
          <Input autoComplete="off" autoCapitalize="words" value={form.last_name} onChange={(e) => patch({ last_name: e.target.value })} />
        </Field>
        <Field label="Phone" required>
          <Input type="tel" inputMode="tel" autoComplete="off" value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
        </Field>
        {settings.field_email && (
          <Field label="Email">
            <Input type="email" inputMode="email" autoComplete="off" value={form.email} onChange={(e) => patch({ email: e.target.value })} />
          </Field>
        )}
        {settings.field_issue && (
          <Field label="Issue">
            <Textarea value={form.issue} onChange={(e) => patch({ issue: e.target.value })} />
          </Field>
        )}
        {settings.field_notes && (
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => patch({ notes: e.target.value })} />
          </Field>
        )}
      </section>

      {settings.field_shoe_size && (
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight">Shoe size</h2>
          <ShoeSizePicker value={form.shoe_size} onChange={(v) => patch({ shoe_size: v })} defaultSystem={settings.shoe_size_default} />
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-extrabold tracking-tight">Arch type &amp; price</h2>
        {!arch && orig.arch_type_name && (
          <p className="mb-4 rounded-2xl bg-background px-4 py-3 text-[15px] font-semibold text-muted">
            Currently <b>{orig.arch_type_name}</b>. Pick a type below only if you want to change it.
          </p>
        )}
        <OrderTerms archTypes={archTypes} methods={settings.payment_methods} value={terms} onChange={setTerms} />
      </section>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pt-3 backdrop-blur">
        <div className="mx-auto max-w-3xl space-y-3 px-4">
          <Button variant="whatsapp" size="lg" className="w-full" onClick={() => save(true)} loading={busy !== null} disabled={busy !== null}>
            <Send /> {firstSend ? "Save & send to supplier" : "Save & send update to supplier"}
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={() => save(false)} disabled={busy !== null}>
            <Check /> Save without sending
          </Button>
        </div>
      </div>

      {busy && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 backdrop-blur-sm">
          <div className="animate-pop mx-6 flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl bg-card p-8 text-center shadow-lift">
            <div className="size-14 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="text-lg font-extrabold">{busy}</p>
          </div>
        </div>
      )}

      {sent && (
        <SupplierSheet
          assessment={sent.assessment}
          changes={sent.changes}
          open={sheet}
          onOpenChange={(o) => {
            setSheet(o);
            if (!o) router.replace(`/jobs/${id}`);
          }}
        />
      )}
    </div>
  );
}
