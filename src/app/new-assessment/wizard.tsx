"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { get, set, del } from "idb-keyval";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, Printer, Send, TriangleAlert, UserRound, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ASSESSOR_COLUMNS, type ArchType, type Assessment, type Assessor } from "@/lib/types";
import { money, parseMoney } from "@/lib/format";
import { finalizeFiles, type SaveResult } from "@/lib/assessments";
import { useSettings } from "@/components/settings-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FoamPhotoCard } from "@/components/foam-photo-card";
import { EMPTY_TERMS, OrderTerms, termsBalance, type Terms } from "@/components/order-terms";
import { SupplierSheet } from "@/components/supplier-sheet";
import { ShoeSizePicker } from "@/components/shoe-size-picker";

const STEPS = ["Assessor", "Customer", "Foam", "Price", "Review"];
const STORE_KEY = "insole-wizard-v1";

interface Form {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  shoe_size: string;
  issue: string;
  notes: string;
}
const EMPTY_FORM: Form = { first_name: "", last_name: "", phone: "", email: "", shoe_size: "", issue: "", notes: "" };

export function Wizard() {
  const router = useRouter();
  const settings = useSettings();
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [archTypes, setArchTypes] = useState<ArchType[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [step, setStep] = useState(0);
  const [sub, setSub] = useState(0);
  const [assessorId, setAssessorId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [right, setRight] = useState<Blob | null>(null);
  const [left, setLeft] = useState<Blob | null>(null);
  const [terms, setTerms] = useState<Terms>(EMPTY_TERMS);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [pinFor, setPinFor] = useState<Assessor | null>(null);
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [sheet, setSheet] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const customerScreens = useMemo(() => {
    const s = ["name", "phone"];
    if (settings.field_shoe_size) s.push("size");
    if (settings.field_email || settings.field_issue || settings.field_notes) s.push("extra");
    return s;
  }, [settings.field_shoe_size, settings.field_email, settings.field_issue, settings.field_notes]);

  // ----- load lists + restore in-progress draft (works offline) -----
  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const [a, t] = await Promise.all([
        supabase.from("assessors").select(ASSESSOR_COLUMNS).eq("active", true).order("sort_order").order("name"),
        supabase.from("arch_types").select("*").eq("active", true).order("sort_order").order("name"),
      ]);
      if (a.data) setAssessors(a.data as Assessor[]);
      if (t.data) setArchTypes(t.data as ArchType[]);
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          setStep(s.step ?? 0);
          setSub(s.sub ?? 0);
          setAssessorId(s.assessorId ?? null);
          setForm({ ...EMPTY_FORM, ...s.form });
          setTerms({ ...EMPTY_TERMS, ...s.terms });
          setRight((await get(STORE_KEY + "-right")) ?? null);
          setLeft((await get(STORE_KEY + "-left")) ?? null);
          if (s.assessorId || s.form?.first_name) toast("Picked up where you left off");
        }
      } catch {
        /* ignore corrupted draft */
      }
      setLoaded(true);
    })();
    const on = () => setOnline(navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  useEffect(() => {
    if (!loaded || result) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ step, sub, assessorId, form, terms }));
    } catch {
      /* storage full / blocked */
    }
  }, [loaded, result, step, sub, assessorId, form, terms]);

  useEffect(() => {
    if (!loaded || result) return;
    (right ? set(STORE_KEY + "-right", right) : del(STORE_KEY + "-right")).catch(() => {});
  }, [right, loaded, result]);
  useEffect(() => {
    if (!loaded || result) return;
    (left ? set(STORE_KEY + "-left", left) : del(STORE_KEY + "-left")).catch(() => {});
  }, [left, loaded, result]);

  const clearStore = useCallback(async () => {
    try {
      localStorage.removeItem(STORE_KEY);
      await Promise.all([del(STORE_KEY + "-right"), del(STORE_KEY + "-left")]);
    } catch {
      /* ignore */
    }
  }, []);

  const assessor = assessors.find((a) => a.id === assessorId) ?? null;
  const arch = archTypes.find((a) => a.id === terms.archId) ?? null;
  const patch = (p: Partial<Form>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors({});
  };

  // ----- validation -----
  function validateCustomer(screen: string) {
    const e: Record<string, string> = {};
    if (screen === "name") {
      if (!form.first_name.trim()) e.first_name = "First name is required";
      if (!form.last_name.trim()) e.last_name = "Last name is required";
    }
    if (screen === "phone" && form.phone.replace(/\D/g, "").length < 6) e.phone = "Enter a valid phone number";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function draftProblems() {
    const p: string[] = [];
    if (!assessorId) p.push("Assessor");
    if (!form.first_name.trim() || !form.last_name.trim()) p.push("Name");
    if (!form.phone.trim()) p.push("Phone");
    if (settings.field_shoe_size && !form.shoe_size.trim()) p.push("Shoe size");
    if (!right) p.push("Right foot photo");
    if (!left) p.push("Left foot photo");
    return p;
  }
  function orderProblems() {
    const p = draftProblems();
    if (!arch) p.push("Arch type");
    if (arch && termsBalance(terms) < 0) p.push("Deposit is more than the price");
    if (arch && parseMoney(terms.deposit) > 0 && !terms.method) p.push("Deposit payment method");
    return p;
  }

  // ----- navigation -----
  function next() {
    if (step === 0) {
      if (!assessor) return toast.error("Please choose who the assessor is");
      return setStep(1);
    }
    if (step === 1) {
      const screen = customerScreens[sub];
      if (!validateCustomer(screen)) return;
      if (sub < customerScreens.length - 1) return setSub(sub + 1);
      return setStep(2);
    }
    if (step === 2) {
      if (!right || !left) return toast.error("Take both foam photos first", { description: "Right foot and left foot are needed." });
      return setStep(3);
    }
    if (step === 3) {
      if (arch && termsBalance(terms) < 0) return toast.error("Deposit can't be more than the price");
      if (arch && parseMoney(terms.deposit) > 0 && !terms.method) return toast.error("Choose how the deposit was paid");
      return setStep(4);
    }
  }
  function back() {
    if (step === 1 && sub > 0) return setSub(sub - 1);
    if (step === 0) return setConfirmExit(true);
    if (step === 2) setSub(customerScreens.length - 1);
    setStep(step - 1);
  }

  function chooseAssessor(a: Assessor) {
    if (settings.assessor_pin_enabled && a.has_pin) {
      setPin("");
      setPinFor(a);
    } else {
      setAssessorId(a.id);
    }
  }
  async function checkPin() {
    if (!pinFor) return;
    const { data, error } = await supabaseBrowser().rpc("verify_assessor_pin", { p_assessor: pinFor.id, p_pin: pin });
    if (error || !data) {
      setPin("");
      return toast.error("Wrong PIN");
    }
    setAssessorId(pinFor.id);
    setPinFor(null);
  }

  // ----- save -----
  async function save(asDraft: boolean) {
    const problems = asDraft ? draftProblems() : orderProblems();
    if (problems.length) {
      return toast.error("Still needed", { description: problems.join(", ") });
    }
    if (!navigator.onLine) {
      return toast.error("You're offline", { description: "Your answers are kept safe on this device. Save once you're back online." });
    }
    const supabase = supabaseBrowser();
    const id = crypto.randomUUID();
    try {
      setSaving("Uploading photos…");
      const upload = async (b: Blob, name: string) => {
        const path = `${id}/${name}`;
        const { error } = await supabase.storage.from("foam-photos").upload(path, b, { contentType: "image/jpeg", upsert: true });
        if (error) throw new Error(`Photo upload failed: ${error.message}`);
        return path;
      };
      const [rPath, lPath] = await Promise.all([upload(right!, "Right.jpg"), upload(left!, "Left.jpg")]);

      setSaving("Saving…");
      const { error } = await supabase.from("assessments").insert({
        id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        shoe_size: form.shoe_size.trim() || null,
        issue: form.issue.trim() || null,
        notes: form.notes.trim() || null,
        arch_type_id: arch?.id ?? null,
        arch_type_name: arch?.name ?? null,
        price: arch ? parseMoney(terms.price) : 0,
        deposit_amount: arch ? parseMoney(terms.deposit) : 0,
        deposit_payment_method: arch && parseMoney(terms.deposit) > 0 ? terms.method : null,
        assessor_id: assessor!.id,
        assessor_name: assessor!.name,
        status: asDraft ? "draft" : "new",
        foam_photo_right_url: rPath,
        foam_photo_left_url: lPath,
      });
      if (error) throw new Error(error.message);

      setSaving("Making PDF & backing up…");
      const res = await finalizeFiles(id, settings, { right, left });
      await clearStore();

      if (asDraft) {
        toast.success("Saved as draft!", { description: `${res.assessment.order_number} - printing label…` });
        if (res.driveWarning) toast.warning(res.driveWarning);
        router.replace(`/print/${id}?auto=1&from=draft`);
        return;
      }
      toast.success("Saved!", { description: res.assessment.order_number });
      setResult(res);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  // ----- render helpers -----
  const pct = ((step + (step === 4 ? 1 : 0.5)) / STEPS.length) * 100;

  if (result) return <Success result={result} sheet={sheet} setSheet={setSheet} onDone={() => router.replace("/jobs")} />;

  return (
    <div className="pb-32">
      {/* progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-extrabold uppercase tracking-wider text-primary">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </p>
          <button onClick={() => setConfirmExit(true)} className="grid size-11 place-items-center rounded-full text-muted hover:bg-line/60" aria-label="Close">
            <X className="size-6" />
          </button>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-gold transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
        {!online && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-bold text-amber-900">
            <WifiOff className="size-5" /> Offline - keep going, your answers are saved on this device.
          </p>
        )}
      </div>

      <div key={`${step}-${sub}`} className="animate-step">
        {step === 0 && (
          <section>
            <h1 className="text-3xl font-extrabold tracking-tight">Who is the assessor?</h1>
            <p className="mt-1 text-base font-medium text-muted">Tap your name to start.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {assessors.map((a) => {
                const on = a.id === assessorId;
                return (
                  <button
                    key={a.id}
                    onClick={() => chooseAssessor(a)}
                    className={cn(
                      "flex min-h-[72px] items-center gap-4 rounded-2xl border-2 bg-card px-5 text-left transition-all active:scale-[0.98]",
                      on ? "border-primary bg-primary/5 shadow-soft" : "border-line",
                    )}
                  >
                    <span className={cn("grid size-12 place-items-center rounded-full text-lg font-extrabold", on ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                      {on ? <Check className="size-6 stroke-[3]" /> : a.name[0]?.toUpperCase()}
                    </span>
                    <span className="flex-1 text-xl font-extrabold">{a.name}</span>
                  </button>
                );
              })}
              {loaded && assessors.length === 0 && (
                <div className="rounded-2xl bg-card p-6 text-center shadow-soft sm:col-span-2">
                  <UserRound className="mx-auto size-12 text-primary/40" />
                  <p className="mt-3 text-lg font-extrabold">No assessors yet</p>
                  <p className="mt-1 text-base font-medium text-muted">Add your team in Settings first.</p>
                  <Button asChild className="mt-4">
                    <Link href="/settings">Open Settings</Link>
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}

        {step === 1 && customerScreens[sub] === "name" && (
          <Screen title="What's the customer's name?">
            <Field label="First name" required error={errors.first_name}>
              <Input autoFocus autoComplete="off" autoCapitalize="words" value={form.first_name} onChange={(e) => patch({ first_name: e.target.value })} />
            </Field>
            <Field label="Last name" required error={errors.last_name}>
              <Input autoComplete="off" autoCapitalize="words" value={form.last_name} onChange={(e) => patch({ last_name: e.target.value })} />
            </Field>
          </Screen>
        )}
        {step === 1 && customerScreens[sub] === "phone" && (
          <Screen title="Best phone number?" sub="Used to tell them when it's ready.">
            <Field label="Phone" required error={errors.phone}>
              <Input autoFocus type="tel" inputMode="tel" autoComplete="off" value={form.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="07123 456789" />
            </Field>
          </Screen>
        )}
        {step === 1 && customerScreens[sub] === "size" && (
          <Screen title="What's their shoe size?">
            <ShoeSizePicker value={form.shoe_size} onChange={(v) => patch({ shoe_size: v })} defaultSystem={settings.shoe_size_default} />
          </Screen>
        )}
        {step === 1 && customerScreens[sub] === "extra" && (
          <Screen title="Anything else?" sub="All optional.">
            {settings.field_issue && (
              <Field label="Issue">
                <Textarea value={form.issue} onChange={(e) => patch({ issue: e.target.value })} placeholder="What brings them in?" />
              </Field>
            )}
            {settings.field_notes && (
              <Field label="Notes">
                <Textarea value={form.notes} onChange={(e) => patch({ notes: e.target.value })} />
              </Field>
            )}
            {settings.field_email && (
              <Field label="Email">
                <Input type="email" inputMode="email" autoComplete="off" value={form.email} onChange={(e) => patch({ email: e.target.value })} />
              </Field>
            )}
          </Screen>
        )}

        {step === 2 && (
          <section>
            <h1 className="text-3xl font-extrabold tracking-tight">Foam photos</h1>
            <p className="mt-1 text-base font-medium text-muted">One clear photo of each foam impression.</p>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <FoamPhotoCard label="RIGHT FOOT" blob={right} onChange={setRight} />
              <FoamPhotoCard label="LEFT FOOT" blob={left} onChange={setLeft} />
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="text-3xl font-extrabold tracking-tight">Price & deposit</h1>
            <p className="mb-6 mt-1 text-base font-medium text-muted">Customer not sure yet? Choose “Not decided yet” and put it aside.</p>
            <OrderTerms archTypes={archTypes} methods={settings.payment_methods} value={terms} onChange={setTerms} allowUndecided />
          </section>
        )}

        {step === 4 && (
          <Review
            form={form}
            assessor={assessor?.name ?? ""}
            archName={arch?.name ?? null}
            terms={terms}
            right={right}
            left={left}
            draftMissing={draftProblems()}
          />
        )}
      </div>

      {/* sticky action bar */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pt-3 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4">
          {step < 4 ? (
            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="w-20 shrink-0 px-0" onClick={back} aria-label="Back">
                <ArrowLeft />
              </Button>
              <Button size="lg" className="flex-1" onClick={next}>
                Next <ArrowRight />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg" onClick={() => save(true)} disabled={!!saving}>
                  <ClipboardCheck /> Put Aside
                </Button>
                <Button size="lg" onClick={() => save(false)} disabled={!!saving || !arch}>
                  <Check /> Save Order
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={back}>
                <ArrowLeft /> Back
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* saving overlay */}
      {saving && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 backdrop-blur-sm">
          <div className="animate-pop mx-6 flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl bg-card p-8 text-center shadow-lift">
            <div className="size-14 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="text-lg font-extrabold">{saving}</p>
          </div>
        </div>
      )}

      {/* PIN dialog */}
      <Dialog open={!!pinFor} onOpenChange={(o) => !o && setPinFor(null)}>
        <DialogContent title={`Hi ${pinFor?.name ?? ""}`} description="Enter your PIN">
          <Input type="password" inputMode="numeric" autoFocus maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && checkPin()} className="text-center text-3xl tracking-[0.5em]" />
          <Button size="lg" className="mt-4 w-full" onClick={checkPin} disabled={pin.length < 4}>
            Continue
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
        <DialogContent title="Leave this assessment?" description="Your answers stay saved on this device so you can carry on later.">
          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={() => setConfirmExit(false)}>
              Keep going
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/jobs")}>
              Leave for now
            </Button>
            <Button
              variant="destructive-outline"
              className="w-full"
              onClick={async () => {
                await clearStore();
                router.push("/jobs");
              }}
            >
              Discard everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Screen({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-base font-medium text-muted">{sub}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function Review({
  form,
  assessor,
  archName,
  terms,
  right,
  left,
  draftMissing,
}: {
  form: Form;
  assessor: string;
  archName: string | null;
  terms: Terms;
  right: Blob | null;
  left: Blob | null;
  draftMissing: string[];
}) {
  const settings = useSettings();
  const [urls, setUrls] = useState<{ r?: string; l?: string }>({});
  useEffect(() => {
    const r = right ? URL.createObjectURL(right) : undefined;
    const l = left ? URL.createObjectURL(left) : undefined;
    setUrls({ r, l });
    return () => {
      if (r) URL.revokeObjectURL(r);
      if (l) URL.revokeObjectURL(l);
    };
  }, [right, left]);

  const row = (k: string, v: string) =>
    v ? (
      <div className="flex justify-between gap-4 py-2.5">
        <dt className="text-[15px] font-semibold text-muted">{k}</dt>
        <dd className="text-right text-[17px] font-bold">{v}</dd>
      </div>
    ) : null;

  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight">Review & save</h1>
      {draftMissing.length > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" /> Missing: {draftMissing.join(", ")}
        </p>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[
          ["Right foot", urls.r],
          ["Left foot", urls.l],
        ].map(([label, src]) => (
          <div key={label} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-primary/5">
            {src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={label} className="size-full object-cover" />
            )}
            <span className="absolute bottom-2 left-2 rounded-full bg-ink/70 px-3 py-1 text-xs font-extrabold text-white">{label}</span>
          </div>
        ))}
      </div>
      <dl className="mt-5 divide-y divide-line rounded-3xl bg-card px-5 py-2 shadow-soft">
        {row("Customer", `${form.first_name} ${form.last_name}`)}
        {row("Phone", form.phone)}
        {settings.field_shoe_size && row("Shoe size", form.shoe_size)}
        {settings.field_email && row("Email", form.email)}
        {settings.field_issue && row("Issue", form.issue)}
        {settings.field_notes && row("Notes", form.notes)}
        {row("Assessor", assessor)}
        {row("Arch type", archName ?? "Not decided yet")}
      </dl>
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        {[
          ["Price", money(parseMoney(terms.price))],
          ["Deposit", money(parseMoney(terms.deposit))],
          ["Balance", money(termsBalance(terms))],
        ].map(([k, v], i) => (
          <div key={k} className={cn("rounded-2xl p-4", i === 2 ? "bg-primary text-primary-foreground" : "bg-card shadow-soft")}>
            <p className={cn("text-xs font-bold uppercase tracking-wide", i === 2 ? "opacity-75" : "text-muted")}>{k}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      {!archName && <p className="mt-4 text-center text-sm font-semibold text-muted">No arch type chosen - you can only put this aside as a draft. A label prints straight away.</p>}
    </section>
  );
}

function Success({ result, sheet, setSheet, onDone }: { result: SaveResult; sheet: boolean; setSheet: (b: boolean) => void; onDone: () => void }) {
  const [a, setA] = useState<Assessment>(result.assessment);
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <div className="animate-pop grid size-28 place-items-center rounded-full bg-emerald-100">
        <CheckCircle2 className="size-16 text-emerald-600" />
      </div>
      <h1 className="animate-rise mt-6 text-3xl font-extrabold tracking-tight">Order saved!</h1>
      <p className="mt-2 text-5xl font-extrabold tracking-tight text-primary">{a.order_number}</p>
      <p className="mt-2 text-lg font-semibold text-muted">
        {a.first_name} {a.last_name} · {a.arch_type_name} · balance {money(a.balance_due)}
      </p>
      {result.driveWarning && (
        <p className="mt-5 flex max-w-sm items-start gap-2 rounded-xl bg-amber-100 px-4 py-3 text-left text-sm font-bold text-amber-900">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" /> {result.driveWarning}. The PDF is saved in the app.
        </p>
      )}
      <div className="mt-8 w-full max-w-sm space-y-3">
        <Button variant="whatsapp" size="lg" className="w-full" onClick={() => setSheet(true)}>
          <Send /> Send to Supplier
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href={`/print/${a.id}`}>
            <Printer /> Print Label
          </Link>
        </Button>
        <Button variant="ghost" className="w-full" onClick={onDone}>
          Done
        </Button>
      </div>
      <SupplierSheet assessment={a} open={sheet} onOpenChange={setSheet} onSent={() => setA({ ...a, status: "sent_to_supplier" })} />
    </div>
  );
}
