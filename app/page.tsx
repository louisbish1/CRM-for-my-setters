"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { LeadTable } from "@/components/lead-table";
import { NotificationButton } from "@/components/notification-button";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
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
        setUserLabel(label);
        setIsAdmin(Boolean(approval.is_admin));
      }

      const { data } = await supabase
        .from("leads")
        .select(
          "id, business_name, contact_name, phone, email, need, estimated_value, status, notes, created_by_user_id, created_by_email, created_by_name, archived, created_at",
        )
        .eq("archived", false)
        .order("created_at", { ascending: false });
      if (mounted) {
        setLeads((data as Lead[]) || []);
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
      <header className="mb-4 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.05] p-4 shadow-glow backdrop-blur-xl sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:p-5">
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
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
          <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/60">{userLabel}</span>
          {isAdmin ? <NotificationButton /> : null}
          <AddLeadDialog creatorLabel={userLabel} onCreated={(lead) => setLeads((current) => [lead, ...current])} />
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
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
