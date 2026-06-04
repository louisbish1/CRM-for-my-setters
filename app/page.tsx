"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw, Search, X } from "lucide-react";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { LeadTable } from "@/components/lead-table";
import { NotificationButton } from "@/components/notification-button";
import { OnlineUsers } from "@/components/online-users";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Lead, LeadTemperature } from "@/lib/types";

const leadSelect =
  "id, business_name, contact_name, phone, email, need, estimated_value, status, temperature, notes, created_by_user_id, created_by_email, created_by_name, archived, created_at";
const legacyLeadSelect =
  "id, business_name, contact_name, phone, email, need, estimated_value, status, notes, created_by_user_id, created_by_email, created_by_name, archived, created_at";
const temperatureStorageKey = "crm-lead-temperatures";

type TemperatureOverrides = Record<string, LeadTemperature>;

function readTemperatureOverrides() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(temperatureStorageKey) || "{}") as TemperatureOverrides;
  } catch {
    return {};
  }
}

function writeTemperatureOverride(id: string, temperature: LeadTemperature) {
  if (typeof window === "undefined") return;

  const overrides = readTemperatureOverrides();
  overrides[id] = temperature;
  window.localStorage.setItem(temperatureStorageKey, JSON.stringify(overrides));
}

function normalizeLead(lead: Lead | Omit<Lead, "temperature">, overrides: TemperatureOverrides = readTemperatureOverrides()) {
  const legacyStatus = lead.status as string;
  const temperature = "temperature" in lead ? lead.temperature : null;

  return {
    ...lead,
    status: legacyStatus === "Cold" ? "New" : lead.status,
    temperature: overrides[lead.id] || temperature || (legacyStatus === "Cold" ? "Cold" : "Neutral"),
  } satisfies Lead;
}

async function fetchActiveLeads() {
  const temperatureOverrides = readTemperatureOverrides();
  const { data, error } = await supabase
    .from("leads")
    .select(leadSelect)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (!error) return ((data as Lead[]) || []).map((lead) => normalizeLead(lead, temperatureOverrides));

  const { data: legacyData } = await supabase
    .from("leads")
    .select(legacyLeadSelect)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  return ((legacyData as Omit<Lead, "temperature">[]) || []).map((lead) => normalizeLead(lead, temperatureOverrides));
}

export default function DashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [userLabel, setUserLabel] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      const user = sessionData.session.user;
      const { data: approval } = await supabase
        .from("approved_users")
        .select("email, is_admin")
        .eq("email", user.email)
        .maybeSingle();

      if (!approval) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      const label = user.user_metadata.full_name || user.email || "Approved user";
      if (mounted) {
        setCurrentUserId(user.id);
        setCurrentUserEmail(user.email || "");
        setUserLabel(label);
        setIsAdmin(Boolean(approval.is_admin));
      }

      const data = await fetchActiveLeads();
      if (mounted) {
        setLeads(data);
        setLoading(false);
      }
    }

    load();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  async function updateLead(
    id: string,
    patch: Partial<
      Pick<
        Lead,
        "business_name" | "contact_name" | "phone" | "email" | "status" | "temperature" | "notes" | "estimated_value" | "need"
      >
    >,
  ) {
    const lead = leads.find((item) => item.id === id);
    if (!lead || (!isAdmin && lead.created_by_user_id !== currentUserId)) return;

    if (patch.temperature) {
      writeTemperatureOverride(id, patch.temperature);
    }

    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
    if (!id.startsWith("demo-")) {
      const { error } = await supabase.from("leads").update(patch).eq("id", id);

      if (error && "temperature" in patch) {
        const { temperature: _temperature, ...legacyPatch } = patch;
        if (Object.keys(legacyPatch).length) {
          await supabase.from("leads").update(legacyPatch).eq("id", id);
        }
      }
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function refreshLeads() {
    setRefreshing(true);
    try {
      const data = await fetchActiveLeads();
      setLeads(data);
    } finally {
      setRefreshing(false);
    }
  }

  async function archiveLead(id: string) {
    const lead = leads.find((item) => item.id === id);
    if (!lead || !window.confirm(`Archive ${lead.business_name}?`)) return;

    setLeads((current) => current.filter((item) => item.id !== id));
    if (!id.startsWith("demo-")) {
      await supabase.from("leads").update({ archived: true }).eq("id", id);
    }
  }

  const pipelineValue = useMemo(
    () =>
      leads.reduce(
        (sum, lead) => (lead.status === "Lost" || lead.status === "Won" ? sum : sum + (lead.estimated_value || 0)),
        0,
      ),
    [leads],
  );
  const turnoverValue = useMemo(
    () => leads.reduce((sum, lead) => (lead.status === "Won" ? sum + (lead.estimated_value || 0) : sum), 0),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return leads;

    return leads.filter((lead) => lead.business_name.toLowerCase().includes(query));
  }, [leads, searchQuery]);
  const isSearching = searchQuery.trim().length > 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-6 lg:px-8">
      <header className="relative z-40 mb-4 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.05] p-4 shadow-glow backdrop-blur-xl sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="Louis Bish logo"
            width={64}
            height={64}
            className="h-14 w-14 rounded-full border border-white/10 object-cover shadow-glow"
            priority
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/35">Louis Bish internal board</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">CRM Tracker</h1>
            <p className="mt-2 text-sm text-white/50">
              {loading
                ? "Loading leads..."
                : `${leads.length} leads · £${pipelineValue.toLocaleString()} · £${turnoverValue.toLocaleString()} won`}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <OnlineUsers
              currentUserId={currentUserId}
              userEmail={currentUserEmail}
              userLabel={userLabel}
              userRole={isAdmin ? "admin" : "setter"}
              leads={leads}
            />
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 px-0"
                type="button"
                onClick={refreshLeads}
                disabled={loading || refreshing}
                aria-label="Refresh leads"
                title="Refresh leads"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 px-0"
                type="button"
                aria-label="Client finder"
                title="Client finder"
                asChild
              >
                <Link href="/client-finder">
                  <Search className="h-4 w-4" />
                </Link>
              </Button>
              {isAdmin ? <NotificationButton /> : null}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 px-0"
                onClick={signOut}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <AddLeadDialog creatorLabel={userLabel} onCreated={(lead) => setLeads((current) => [normalizeLead(lead), ...current])} />
        </div>
      </header>

      <section className="mb-4 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.05] p-3 shadow-glow backdrop-blur-xl sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            className="h-11 w-full rounded-full border border-white/10 bg-black/20 pl-10 pr-10 text-base text-white outline-none transition placeholder:text-white/35 focus:border-white/25 focus:bg-black/30 sm:text-sm"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search leads by name"
            aria-label="Search leads by name"
          />
          {searchQuery ? (
            <button
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/35 transition hover:bg-white/10 hover:text-white"
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {isSearching ? (
          <p className="px-2 text-xs font-medium text-white/45 sm:shrink-0">{filteredLeads.length} found</p>
        ) : null}
      </section>

      <LeadTable
        leads={filteredLeads}
        currentUserId={currentUserId}
        onChange={updateLead}
        onArchive={archiveLead}
        canArchive={isAdmin}
        emptyStateTitle={isSearching ? "No matching leads" : undefined}
        emptyStateDescription={isSearching ? "Try a different lead name." : undefined}
      />
    </main>
  );
}
