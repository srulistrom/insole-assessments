"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HardDrive, KeyRound, LogOut, MessageCircle, Palette, Plus, Trash2, Unplug, Users, Wallet, Layers, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ASSESSOR_COLUMNS, type ArchType, type Assessor } from "@/lib/types";
import { type AppSettings } from "@/lib/settings";
import { parseMoney, fmtDate } from "@/lib/format";
import { useSettings } from "@/components/settings-provider";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NewPasswordForm } from "@/components/new-password-form";
import { InstallCard } from "@/components/install-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const PUBLIC_KEYS = new Set(["shop_name", "shop_address", "shop_phone", "primary_color", "accent_color", "logo_url", "logo_light_url", "logo_dark_url"]);

async function saveSettings(patch: Partial<AppSettings>) {
  const rows = Object.entries(patch).map(([key, value]) => ({ key, value, is_public: PUBLIC_KEYS.has(key) }));
  const { error } = await supabaseBrowser().from("settings").upsert(rows);
  if (error) throw new Error(error.message);
  await fetch("/api/settings/revalidate", { method: "POST" }).catch(() => {}); // refresh the server's settings cache
}

function Section({ icon: Icon, title, hint, children }: { icon: typeof Palette; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="animate-rise rounded-3xl bg-card p-6 shadow-soft">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
          {hint && <p className="text-sm font-medium text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function SettingsView() {
  const router = useRouter();
  const params = useSearchParams();
  const settings = useSettings();

  // toast result of the Google OAuth round trip
  useEffect(() => {
    const d = params.get("drive");
    if (!d) return;
    const msg: Record<string, [string, string?]> = {
      connected: ["Google Drive connected!"],
      denied: ["Google Drive not connected", "You cancelled the Google permission screen."],
      not_configured: ["Google Drive isn't switched on yet", "It needs a one-time setup in Google Cloud first (the two GOOGLE_ keys on the server)."],
      bad_state: ["Please try connecting again"],
      no_refresh: ["Google didn't allow offline access", "Remove the app at myaccount.google.com/permissions and connect again."],
      error: ["Google Drive connection failed"],
    };
    const [title, description] = msg[d] ?? ["Google Drive"];
    (d === "connected" ? toast.success : toast.error)(title, { description });
    router.replace("/settings", { scroll: false });
    router.refresh();
  }, [params, router]);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
      <InstallCard />
      <ArchTypes />
      <Assessors />
      <Fields />
      <Whatsapp />
      <Payments />
      <Drive />
      <Section icon={KeyRound} title="Change Password" hint="For the shared shop login">
        <NewPasswordForm onDone={() => {}} />
      </Section>
      <button
        onClick={async () => {
          await supabaseBrowser().auth.signOut();
          router.replace("/login");
          router.refresh();
        }}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold text-muted"
      >
        <LogOut className="size-5" /> Sign out of this device
      </button>
    </div>
  );
}

/* ---------------- Arch types ---------------- */
function ArchTypes() {
  const [rows, setRows] = useState<ArchType[]>([]);
  const [del, setDel] = useState<ArchType | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from("arch_types").select("*").order("sort_order").order("name");
    setRows((data as ArchType[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const update = async (id: string, patch: Partial<ArchType>) => {
    const { error } = await supabaseBrowser().from("arch_types").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Saved!");
  };

  return (
    <Section icon={Layers} title="Arch Types" hint="Name and price - tap away to save">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <Input defaultValue={r.name} onBlur={(e) => e.target.value.trim() && e.target.value !== r.name && update(r.id, { name: e.target.value.trim() })} className="flex-1" />
            <div className="relative w-28 shrink-0">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted">£</span>
              <Input inputMode="decimal" defaultValue={String(r.price)} onBlur={(e) => update(r.id, { price: parseMoney(e.target.value) })} className="pl-9" />
            </div>
            <button onClick={() => setDel(r)} className="grid size-14 shrink-0 place-items-center rounded-2xl text-red-600 active:bg-red-50" aria-label={`Delete ${r.name}`}>
              <Trash2 className="size-6" />
            </button>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        className="mt-4 w-full"
        onClick={async () => {
          const { error } = await supabaseBrowser().from("arch_types").insert({ name: "New type", price: 0, sort_order: rows.length + 1 });
          if (error) toast.error(error.message);
          else load();
        }}
      >
        <Plus /> Add arch type
      </Button>
      <ConfirmDelete
        open={!!del}
        title={`Delete ${del?.name}?`}
        text="Existing orders keep their arch type name."
        onCancel={() => setDel(null)}
        onConfirm={async () => {
          const { error } = await supabaseBrowser().from("arch_types").delete().eq("id", del!.id);
          if (error) toast.error(error.message);
          else toast.success("Deleted");
          setDel(null);
          load();
        }}
      />
    </Section>
  );
}

/* ---------------- Assessors + PIN ---------------- */
function Assessors() {
  const s = useSettings();
  const router = useRouter();
  const [rows, setRows] = useState<Assessor[]>([]);
  const [del, setDel] = useState<Assessor | null>(null);
  const [pinFor, setPinFor] = useState<Assessor | null>(null);
  const [pin, setPin] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser().from("assessors").select(ASSESSOR_COLUMNS).order("sort_order").order("name");
    if (error) toast.error("Couldn't load assessors", { description: error.message });
    setRows((data as Assessor[]) ?? []);
  }, []);

  async function addAssessor(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return toast.error("Type the assessor's name first");
    setAdding(true);
    const { error } = await supabaseBrowser().from("assessors").insert({ name, sort_order: rows.length + 1 });
    setAdding(false);
    if (error) return toast.error("Couldn't add assessor", { description: `${error.message}${error.code ? ` (${error.code})` : ""}` });
    setNewName("");
    toast.success(`${name} added!`);
    load();
  }
  useEffect(() => {
    load();
  }, [load]);

  async function savePin(value: string) {
    const { error } = await supabaseBrowser().rpc("set_assessor_pin", { p_assessor: pinFor!.id, p_pin: value });
    if (error) return toast.error(error.message);
    toast.success(value ? "PIN set!" : "PIN removed");
    setPinFor(null);
    setPin("");
    load();
  }

  return (
    <Section icon={Users} title="Assessors" hint="Who can be chosen at the start of an assessment">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <Input
              defaultValue={r.name}
              onBlur={async (e) => {
                const v = e.target.value.trim();
                if (!v || v === r.name) return;
                const { error } = await supabaseBrowser().from("assessors").update({ name: v }).eq("id", r.id);
                if (error) toast.error(error.message);
                else toast.success("Saved!");
              }}
              className="flex-1"
            />
            {s.assessor_pin_enabled && (
              <button onClick={() => setPinFor(r)} className={`grid size-14 shrink-0 place-items-center rounded-2xl ${r.has_pin ? "bg-emerald-100 text-emerald-700" : "bg-primary/8 text-primary"}`} aria-label={`PIN for ${r.name}`}>
                <KeyRound className="size-6" />
              </button>
            )}
            <button onClick={() => setDel(r)} className="grid size-14 shrink-0 place-items-center rounded-2xl text-red-600 active:bg-red-50" aria-label={`Delete ${r.name}`}>
              <Trash2 className="size-6" />
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-base font-medium text-muted">No assessors yet - add the first one below.</p>}
      </div>
      <form onSubmit={addAssessor} className="mt-4 flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Assessor's name" autoCapitalize="words" />
        <Button type="submit" variant="outline" className="shrink-0" loading={adding}>
          <Plus /> Add
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-5">
        <div>
          <p className="text-[17px] font-bold">Require PIN</p>
          <p className="text-sm font-medium text-muted">Each assessor enters a PIN before starting. Off by default.</p>
        </div>
        <Switch
          checked={s.assessor_pin_enabled}
          onCheckedChange={async (v) => {
            await saveSettings({ assessor_pin_enabled: v });
            toast.success(v ? "PIN turned on - set a PIN for each assessor" : "PIN turned off");
            router.refresh();
          }}
        />
      </div>

      <ConfirmDelete
        open={!!del}
        title={`Delete ${del?.name}?`}
        text="Existing orders keep this assessor's name."
        onCancel={() => setDel(null)}
        onConfirm={async () => {
          const { error } = await supabaseBrowser().from("assessors").delete().eq("id", del!.id);
          if (error) toast.error(error.message);
          else toast.success("Deleted");
          setDel(null);
          load();
        }}
      />
      <Dialog open={!!pinFor} onOpenChange={(o) => !o && setPinFor(null)}>
        <DialogContent title={`PIN for ${pinFor?.name ?? ""}`} description="4 to 6 digits">
          <Input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className="text-center text-3xl tracking-[0.5em]" />
          <div className="mt-4 space-y-3">
            <Button size="lg" className="w-full" disabled={pin.length < 4} onClick={() => savePin(pin)}>
              Save PIN
            </Button>
            {pinFor?.has_pin && (
              <Button variant="destructive-outline" className="w-full" onClick={() => savePin("")}>
                Remove PIN
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

/* ---------------- Field toggles ---------------- */
function Fields() {
  const s = useSettings();
  const router = useRouter();
  const items: [keyof AppSettings, string][] = [
    ["field_email", "Email"],
    ["field_notes", "Notes"],
    ["field_issue", "Issue"],
    ["field_shoe_size", "Shoe size"],
  ];
  return (
    <Section icon={ToggleRight} title="Customer Fields" hint="Show or hide on the assessment form">
      <div className="divide-y divide-line">
        {items.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between py-3.5">
            <span className="text-[17px] font-bold">{label}</span>
            <Switch
              checked={s[key] as boolean}
              onCheckedChange={async (v) => {
                await saveSettings({ [key]: v });
                router.refresh();
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-line pt-4">
        <p className="text-[17px] font-bold">Shoe size starts on</p>
        <p className="mb-3 text-sm font-medium text-muted">Staff can still switch between UK and EU on each assessment.</p>
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-line/70 p-1.5">
          {(["UK", "EU"] as const).map((sys) => (
            <button
              key={sys}
              type="button"
              onClick={async () => {
                await saveSettings({ shoe_size_default: sys });
                toast.success(`Shoe sizes now start on ${sys}`);
                router.refresh();
              }}
              className={`h-12 rounded-xl text-base font-extrabold transition-all active:scale-[0.97] ${s.shoe_size_default === sys ? "bg-card text-primary shadow-soft" : "text-muted"}`}
            >
              {sys}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-muted">Name and phone are always required. Drafts need shoe size when it is shown.</p>
    </Section>
  );
}

/* ---------------- WhatsApp ---------------- */
function Whatsapp() {
  const s = useSettings();
  const router = useRouter();
  const [link, setLink] = useState(s.whatsapp_group_link);
  const [group, setGroup] = useState(s.whatsapp_group_name);
  const [cc, setCc] = useState(s.country_code);
  return (
    <Section icon={MessageCircle} title="WhatsApp Group" hint="Where supplier orders are sent">
      <div className="space-y-4">
        <Field label="Group invite link">
          <Input type="url" inputMode="url" placeholder="https://chat.whatsapp.com/..." value={link} onChange={(e) => setLink(e.target.value)} />
        </Field>
        <Field label="Supplier group name">
          <Input value={group} onChange={(e) => setGroup(e.target.value)} />
        </Field>
        <Field label="Customer country code" hint="UK = 44">
          <Input inputMode="numeric" value={cc} onChange={(e) => setCc(e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Button
          size="lg"
          className="w-full"
          onClick={async () => {
            const l = link.trim();
            if (l && !/^https:\/\/chat\.whatsapp\.com\//.test(l)) return toast.error("That doesn't look like a WhatsApp group link");
            await saveSettings({ whatsapp_group_link: l, whatsapp_group_name: group.trim(), country_code: cc || "44" });
            toast.success("Saved!");
            router.refresh();
          }}
        >
          Save WhatsApp
        </Button>
      </div>
    </Section>
  );
}

/* ---------------- Payment methods ---------------- */
function Payments() {
  const s = useSettings();
  const router = useRouter();
  const [list, setList] = useState<string[]>(s.payment_methods);
  const [add, setAdd] = useState("");
  const persist = async (next: string[]) => {
    setList(next);
    await saveSettings({ payment_methods: next });
    toast.success("Saved!");
    router.refresh();
  };
  return (
    <Section icon={Wallet} title="Payment Methods" hint="Choices for the deposit">
      <div className="flex flex-wrap gap-2">
        {list.map((m) => (
          <span key={m} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary/8 pl-5 pr-2 text-base font-bold text-primary">
            {m}
            <button
              onClick={() => (list.length > 1 ? persist(list.filter((x) => x !== m)) : toast.error("Keep at least one method"))}
              className="grid size-9 place-items-center rounded-full hover:bg-primary/10"
              aria-label={`Remove ${m}`}
            >
              <Trash2 className="size-4" />
            </button>
          </span>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = add.trim();
          if (!v || list.some((x) => x.toLowerCase() === v.toLowerCase())) return;
          setAdd("");
          persist([...list, v]);
        }}
      >
        <Input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="e.g. PayPal" />
        <Button type="submit" variant="outline" className="shrink-0">
          <Plus /> Add
        </Button>
      </form>
    </Section>
  );
}

/* ---------------- Google Drive ---------------- */
function Drive() {
  const s = useSettings();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const d = s.google_drive;
  return (
    <Section icon={HardDrive} title="Google Drive" hint="Each order's PDF and photos are saved to /Insole Orders/">
      {d.connected ? (
        <>
          <p className="rounded-2xl bg-emerald-50 p-4 text-[15px] font-bold text-emerald-900">
            Connected{d.email ? ` as ${d.email}` : ""}
            {d.connected_at ? ` · ${fmtDate(d.connected_at)}` : ""}
          </p>
          <Button
            variant="destructive-outline"
            className="mt-4 w-full"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await fetch("/api/google/disconnect", { method: "POST" });
              toast.success("Google Drive disconnected");
              setBusy(false);
              router.refresh();
            }}
          >
            <Unplug /> Disconnect
          </Button>
        </>
      ) : (
        <>
          <p className="mb-4 text-base font-medium text-muted">Not connected. Orders are still saved in the app and you'll see a warning each time.</p>
          <Button size="lg" className="w-full" onClick={() => (window.location.href = "/api/google/connect")}>
            <HardDrive /> Connect Google Drive
          </Button>
        </>
      )}
    </Section>
  );
}

/* ---------------- shared ---------------- */
function ConfirmDelete({ open, title, text, onCancel, onConfirm }: { open: boolean; title: string; text: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent title={title} description={text}>
        <div className="space-y-3">
          <Button variant="destructive" size="lg" className="w-full" onClick={onConfirm}>
            Yes, delete
          </Button>
          <Button variant="outline" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
