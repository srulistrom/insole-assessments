"use client";
import { useEffect, useState } from "react";
import { Share, SquarePlus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** "Install on this device": a button on Android/desktop Chrome, step-by-step help on iPhone/iPad. */
export function InstallCard() {
  const [standalone, setStandalone] = useState(true); // hide until we know
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(isStandalone);
    const ua = navigator.userAgent;
    setIos(/iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setStandalone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return null;

  return (
    <section className="animate-rise rounded-3xl bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Smartphone className="size-6" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Install on this device</h2>
          <p className="text-sm font-medium text-muted">Opens full-screen from the home screen, like an app</p>
        </div>
      </div>

      {prompt ? (
        <Button
          size="lg"
          className="w-full"
          onClick={async () => {
            await prompt.prompt();
            await prompt.userChoice;
            setPrompt(null);
          }}
        >
          <SquarePlus /> Add to Home Screen
        </Button>
      ) : ios ? (
        <ol className="space-y-3 text-[16px] font-semibold">
          <li className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">1</span>
            <span className="flex items-center gap-2">
              Tap the <Share className="inline size-5 text-primary" /> Share button in Safari
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">2</span>
            <span>Choose <b>Add to Home Screen</b></span>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">3</span>
            <span>Tap <b>Add</b></span>
          </li>
        </ol>
      ) : (
        <p className="text-base font-medium text-muted">
          In Chrome, open the <b>⋮</b> menu and choose <b>Add to Home screen</b> (or <b>Install app</b>).
        </p>
      )}
    </section>
  );
}
