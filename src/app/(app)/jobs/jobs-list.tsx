"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Assessment, Status } from "@/lib/types";
import { JobCard } from "@/components/job-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

type Tab = "drafts" | "active" | "picked" | "cancelled";
const TABS: { key: Tab; label: string; statuses: Status[] }[] = [
  { key: "drafts", label: "Drafts", statuses: ["draft"] },
  { key: "active", label: "Active Orders", statuses: ["new", "sent_to_supplier", "arrived"] },
  { key: "picked", label: "Picked Up", statuses: ["picked_up"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];
const ACTIVE_FILTERS: { key: Status | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "sent_to_supplier", label: "Sent to Supplier" },
  { key: "arrived", label: "Arrived" },
];

const EMPTY: Record<Tab, { title: string; text: string }> = {
  drafts: { title: "No drafts yet", text: "When a customer wants time to decide, put their assessment aside and it will wait here." },
  active: { title: "No active orders", text: "New orders appear here until they're picked up." },
  picked: { title: "Nothing picked up yet", text: "Completed orders will show here." },
  cancelled: { title: "Nothing cancelled", text: "Cancelled drafts and orders show here." },
};

export function JobsList() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (TABS.find((t) => t.key === params.get("tab"))?.key ?? "active") as Tab;
  const [filter, setFilter] = useState<Status | "all">("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Assessment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser().from("assessments").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) setError(error.message);
    else {
      setError(null);
      setRows(data as Assessment[]);
    }
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { drafts: 0, active: 0, picked: 0, cancelled: 0 };
    for (const r of rows ?? []) {
      const t = TABS.find((t) => t.statuses.includes(r.status));
      if (t) c[t.key]++;
    }
    return c;
  }, [rows]);

  const needle = q.trim().toLowerCase();
  const digits = needle.replace(/\D/g, "");
  const searching = needle.length > 0;

  const visible = useMemo(() => {
    const statuses = TABS.find((t) => t.key === tab)!.statuses;
    return (rows ?? []).filter((r) => {
      if (searching) {
        // Search spans every tab so a job is always findable.
        const hay = `${r.first_name} ${r.last_name} ${r.order_number}`.toLowerCase();
        return hay.includes(needle) || (digits.length >= 3 && r.phone.replace(/\D/g, "").includes(digits));
      }
      if (!statuses.includes(r.status)) return false;
      if (tab === "active" && filter !== "all" && r.status !== filter) return false;
      return true;
    });
  }, [rows, tab, filter, needle, digits, searching]);

  const setTab = (t: Tab) => {
    setFilter("all");
    router.replace(`/jobs?tab=${t}`, { scroll: false });
  };

  return (
    <div>
      {/* search - always visible */}
      <div className="sticky top-[76px] z-20 -mx-4 bg-background/95 px-4 pb-3 pt-1 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone or INS-001"
            inputMode="search"
            enterKeyHint="search"
            className="h-14 w-full rounded-2xl border-2 border-line bg-card pl-14 pr-14 text-[18px] font-medium shadow-soft placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-muted" aria-label="Clear search">
              <X className="size-6" />
            </button>
          )}
        </div>

        {!searching && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-[16px] font-extrabold transition-all active:scale-95",
                  tab === t.key ? "bg-primary text-primary-foreground shadow-soft" : "bg-card text-ink ring-1 ring-line",
                  (t.key === "cancelled") && tab !== t.key && "text-muted",
                )}
              >
                {t.label}
                <span className={cn("grid min-w-6 place-items-center rounded-full px-1.5 text-xs", tab === t.key ? "bg-white/25" : t.key === "drafts" && counts.drafts ? "bg-amber-200 text-amber-900" : "bg-line")}>{counts[t.key]}</span>
              </button>
            ))}
          </div>
        )}

        {!searching && tab === "active" && (
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
            {ACTIVE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn("h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-colors", filter === f.key ? "bg-gold text-gold-foreground" : "bg-card text-muted ring-1 ring-line")}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">Couldn't load jobs: {error}</p>}

      <div className="mt-3 space-y-4">
        {rows === null && !error && [0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-3xl bg-card" />)}
        {rows !== null && visible.map((a) => <JobCard key={a.id} a={a} onChanged={load} />)}
      </div>

      {rows !== null && visible.length === 0 && (
        <EmptyState
          title={searching ? "No matches" : EMPTY[tab].title}
          text={searching ? `Nothing found for “${q}”.` : EMPTY[tab].text}
          action={
            !searching && tab !== "cancelled" ? (
              <Button asChild>
                <Link href="/new-assessment">
                  <Plus /> New assessment
                </Link>
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
