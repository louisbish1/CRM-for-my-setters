"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw, Search } from "lucide-react";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { LeadTable } from "@/components/lead-table";
import { NotificationButton } from "@/components/notification-button";
import { OnlineUsers } from "@/components/online-users";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/types";

const leadSelect =
  "id, business_name, contact_name, phone, email, need, estimated_value, status, notes, created_by_user_id, created_by_email, created_by_name, archived, created_at";

async function fetchActiveLeads() {
  const { data } = await supabase
    .from("leads")
    .select(leadSelect)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  return (data as Lead[]) || [];
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
      Pick<Lead, "business_name" | "contact_name" | "phone" | "email" | "status" | "notes" | "estimated_value" | "need">
    >,
  ) {
    const lead = leads.find((item) => item.id === id);
    if (!lead || (!isAdmin && lead.created_by_user_id !== currentUserId)) return;

    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
    if (!id.startsWith("demo-")) {
      await supabase.from("leads").update(patch).eq("id", id);
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

  const totalValue = useMemo(
    () => leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0),
    [leads],
  );

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
            <p className="mt-2 text-sm text-white/50">{loading ? "Loading leads..." : `${leads.length} leads · £${totalValue.toLocaleString()}`}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <AddLeadDialog creatorLabel={userLabel} onCreated={(lead) => setLeads((current) => [lead, ...current])} />
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
      </header>

      <LeadTable
        leads={leads}
        currentUserId={currentUserId}
        onChange={updateLead}
        onArchive={archiveLead}
        canArchive={isAdmin}
      />
    </main>
  );
}
