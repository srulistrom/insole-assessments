"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { useSettings } from "@/components/settings-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { shop_name } = useSettings();
  const inWizard = pathname.startsWith("/new-assessment");

  const tab = (href: string, label: string, Icon: typeof Settings) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={cn(
          "flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-bold transition-colors",
          active ? "text-primary" : "text-muted",
        )}
      >
        <Icon className={cn("size-6", active && "stroke-[2.5]")} />
        {label}
      </Link>
    );
  };

  return (
    <div className="mx-auto min-h-dvh max-w-3xl">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-primary px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] text-primary-foreground shadow-soft">
        <BrandLogo onDark className="h-12 w-[4.5rem] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold leading-tight tracking-tight">{shop_name || "Insole Assessments"}</p>
          <p className="text-xs font-semibold opacity-75">Insole assessments</p>
        </div>
      </header>

      <main className={cn("px-4 pt-5", inWizard ? "pb-6" : "pb-28")}>{children}</main>

      {!inWizard && (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center px-4">
            {tab("/jobs", "Jobs", ClipboardList)}
            <Link
              href="/new-assessment"
              className="-mt-7 grid size-[72px] shrink-0 place-items-center rounded-full bg-gold text-gold-foreground shadow-lift transition-transform active:scale-95"
              aria-label="New assessment"
            >
              <Plus className="size-9 stroke-[3]" />
            </Link>
            {tab("/settings", "Settings", Settings)}
          </div>
        </nav>
      )}
    </div>
  );
}
