"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { LeadTable } from "@/components/lead-table";
import { Button } from "@/components/ui/button";
import { demoLeads } from "@/lib/demo-leads";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLabel, setUserLabel] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

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
        .select("email")
        .eq("email", user.email)
        .maybeSingle();

      if (!approval) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      const label = user.user_metadata.full_name || user.email || "Approved user";
      if (mounted) setUserLabel(label);

      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
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

  async function updateLead(id: string, patch: Partial<Pick<Lead, "status" | "notes" | "estimated_value" | "need">>) {
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
    if (!id.startsWith("demo-")) {
      await supabase.from("leads").update(patch).eq("id", id);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function deleteLead(id: string) {
    const lead = leads.find((item) => item.id === id);
    if (!lead || !window.confirm(`Delete ${lead.business_name}?`)) return;

    setLeads((current) => current.filter((item) => item.id !== id));
    if (!id.startsWith("demo-")) {
      await supabase.from("leads").delete().eq("id", id);
    }
  }

  const totalValue = useMemo(
    () => leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0),
    [leads],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-glow backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/35">Louis Bish internal board</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Setter Leads</h1>
          <p className="mt-2 text-sm text-white/50">{loading ? "Loading leads..." : `${leads.length} leads · £${totalValue.toLocaleString()}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/60">{userLabel}</span>
          {!loading && leads.length === 0 ? (
            <Button
              variant="ghost"
              onClick={() => {
                setLeads(demoLeads);
                setPreviewMode(true);
              }}
            >
              Load demo preview
            </Button>
          ) : null}
          {previewMode ? (
            <Button
              variant="ghost"
              onClick={() => {
                setLeads([]);
                setPreviewMode(false);
              }}
            >
              Clear demo
            </Button>
          ) : null}
          <AddLeadDialog creatorLabel={userLabel} onCreated={(lead) => setLeads((current) => [lead, ...current])} />
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      {previewMode ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white/55">
          Demo preview only — these 20 leads are local to the page and are not saved to Supabase.
        </div>
      ) : null}
      <LeadTable leads={leads} onChange={updateLead} onDelete={deleteLead} />
    </main>
  );
}
