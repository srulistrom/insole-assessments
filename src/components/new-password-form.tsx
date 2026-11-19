"use client";
import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

/** Set a new password for the signed-in user (used after a recovery link, and from Settings). */
export function NewPasswordForm({ onDone, label = "Save new password" }: { onDone: () => void; label?: string }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Use at least 8 characters");
    if (pw !== pw2) return toast.error("The two passwords don't match");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password saved!");
    setPw("");
    setPw2("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="New password" hint="at least 8 characters">
        <div className="relative">
          <Input type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className="pr-14" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-muted" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="size-6" /> : <Eye className="size-6" />}
          </button>
        </div>
      </Field>
      <Field label="Type it again">
        <Input type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        <KeyRound /> {label}
      </Button>
    </form>
  );
}
