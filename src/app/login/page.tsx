"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSettings } from "@/components/settings-provider";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { NewPasswordForm } from "@/components/new-password-form";

export default function LoginPage() {
  const router = useRouter();
  const { shop_name, shop_address, shop_phone } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recover, setRecover] = useState(false);

  // "Forgot password" email link: Supabase sends us back here with a temporary session in the URL.
  useEffect(() => {
    const supabase = supabaseBrowser();
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("type") === "recovery" && hash.get("access_token") && hash.get("refresh_token")) {
      supabase.auth
        .setSession({ access_token: hash.get("access_token")!, refresh_token: hash.get("refresh_token")! })
        .then(({ error }) => {
          history.replaceState(null, "", window.location.pathname); // remove the token from the address bar
          if (error) toast.error("That link has expired - request a new one");
          else setRecover(true);
        });
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecover(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      toast.error(error.message === "Invalid login credentials" ? "Wrong email or password" : error.message);
      return;
    }
    toast.success("Welcome back!");
    router.replace("/jobs");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh flex-col justify-center overflow-hidden bg-primary px-5 py-10">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-gold/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-white/10 blur-3xl" />

      <div className="animate-rise relative mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center text-primary-foreground">
          <BrandLogo onDark className="mb-4 h-32 w-56 text-sm drop-shadow-[0_6px_20px_rgba(0,0,0,0.25)]" />
          <h1 className="text-3xl font-extrabold tracking-tight">{shop_name || "Insole Assessments"}</h1>
          {(shop_address || shop_phone) && (
            <p className="mt-2 text-sm font-medium opacity-75">{[shop_address, shop_phone].filter(Boolean).join(" · ")}</p>
          )}
        </div>

        {recover ? (
          <div className="space-y-5 rounded-[32px] bg-card p-6 shadow-lift">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Choose a new password</h2>
              <p className="mt-1 text-base font-medium text-muted">Then you'll be signed in.</p>
            </div>
            <NewPasswordForm
              onDone={() => {
                router.replace("/jobs");
                router.refresh();
              }}
            />
          </div>
        ) : (
        <form onSubmit={submit} className="space-y-5 rounded-[32px] bg-card p-6 shadow-lift">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Sign in</h2>
            <p className="mt-1 text-base font-medium text-muted">You only need to do this once on this device.</p>
          </div>
          <Field label="Email">
            <Input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="shop@example.com" />
          </Field>
          <Field label="Password">
            <div className="relative">
              <Input type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-14" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-muted" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff className="size-6" /> : <Eye className="size-6" />}
              </button>
            </div>
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            <LogIn /> Sign in
          </Button>
        </form>
        )}

        <p className="mt-6 text-center text-sm font-semibold text-primary-foreground/80">
          Insole assessments and orders for {shop_name || "our"} staff
          <span className="mx-2 opacity-60">·</span>
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy policy
          </Link>
        </p>
      </div>
    </div>
  );
}
