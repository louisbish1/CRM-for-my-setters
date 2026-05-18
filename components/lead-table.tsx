"use client";

import { ChangeEvent } from "react";
import { Archive } from "lucide-react";
import { leadStatuses, type Lead, type LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<LeadStatus, string> = {
  New: "bg-white/10 text-white",
  Contacted: "bg-sky-400/15 text-sky-200",
  Interested: "bg-violet-400/15 text-violet-200",
  "Call Booked": "bg-amber-400/15 text-amber-200",
  Won: "bg-emerald-400/15 text-emerald-200",
  Lost: "bg-rose-400/15 text-rose-200",
};

type LeadTableProps = {
  leads: Lead[];
  onChange: (id: string, patch: Partial<Pick<Lead, "status" | "notes" | "estimated_value" | "need">>) => void;
  onArchive: (id: string) => void;
  canArchive: boolean;
};

export function LeadTable({ leads, onChange, onArchive, canArchive }: LeadTableProps) {
  function handleCurrencyChange(id: string, event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    onChange(id, { estimated_value: value ? Number(value) : null });
  }

  if (!leads.length) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-10 text-center shadow-glow backdrop-blur-xl">
        <p className="text-lg font-medium">No leads yet</p>
        <p className="mt-2 text-sm text-white/50">Add the first lead to start the board.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-glow backdrop-blur-xl">
      <div className="hidden max-h-[68vh] overflow-auto md:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/95 text-xs uppercase tracking-[0.2em] text-white/35 backdrop-blur-xl">
            <tr>
              <th className="px-5 py-4">Business</th>
              <th className="px-5 py-4">Contact</th>
              <th className="px-5 py-4">Need</th>
              <th className="px-5 py-4">Value</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Notes</th>
              <th className="px-5 py-4">Created by</th>
              <th className="px-5 py-4">Created</th>
              {canArchive ? <th className="px-5 py-4"></th> : null}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-white/5 transition hover:bg-white/[0.035] last:border-b-0">
                <td className="px-5 py-4 align-top">
                  <div className="font-medium">{lead.business_name}</div>
                  <div className="mt-1 text-white/45">{lead.email || "—"}</div>
                </td>
                <td className="px-5 py-4 align-top">
                  <div>{lead.contact_name || "—"}</div>
                  <div className="mt-1 text-white/45">{lead.phone || "—"}</div>
                </td>
                <td className="px-5 py-4 align-top">
                  <textarea
                    className="min-h-20 w-44 resize-none rounded-2xl border border-transparent bg-transparent px-3 py-2 text-white/55 outline-none transition hover:bg-white/[0.025] focus:border-white/10 focus:bg-black/30 focus:text-white"
                    value={lead.need || ""}
                    onChange={(event) => onChange(lead.id, { need: event.target.value || null })}
                    placeholder="Add need"
                  />
                </td>
                <td className="px-5 py-4 align-top">
                  <input
                    className="w-28 rounded-xl border border-transparent bg-transparent px-3 py-2 text-white/55 outline-none transition hover:bg-white/[0.025] focus:border-white/10 focus:bg-black/30 focus:text-white"
                    type="number"
                    min="0"
                    step="0.01"
                    value={lead.estimated_value ?? ""}
                    onChange={(event) => handleCurrencyChange(lead.id, event)}
                  />
                </td>
                <td className="px-5 py-4 align-top">
                  <select
                    className={cn("rounded-full border-0 px-3 py-2 text-xs font-medium outline-none", statusStyles[lead.status])}
                    value={lead.status}
                    onChange={(event) => onChange(lead.id, { status: event.target.value as LeadStatus })}
                  >
                    {leadStatuses.map((status) => (
                      <option key={status} value={status} className="bg-zinc-950 text-white">
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4 align-top">
                  <textarea
                    className="min-h-20 w-56 resize-none rounded-2xl border border-transparent bg-transparent px-3 py-2 text-white/55 outline-none transition hover:bg-white/[0.025] focus:border-white/10 focus:bg-black/30 focus:text-white"
                    value={lead.notes || ""}
                    onChange={(event) => onChange(lead.id, { notes: event.target.value || null })}
                  />
                </td>
                <td className="px-5 py-4 align-top text-white/65">
                  <div>{lead.created_by_name || lead.created_by_email}</div>
                  {lead.created_by_name ? <div className="mt-1 text-xs text-white/35">{lead.created_by_email}</div> : null}
                </td>
                <td className="px-5 py-4 align-top text-white/45">{new Date(lead.created_at).toLocaleDateString()}</td>
                {canArchive ? (
                  <td className="px-5 py-4 align-top">
                    <button
                      className="rounded-full p-2 text-white/35 transition hover:bg-amber-400/10 hover:text-amber-200"
                      onClick={() => onArchive(lead.id)}
                      aria-label={`Archive ${lead.business_name}`}
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 p-4 md:hidden">
        {leads.map((lead) => (
          <article key={lead.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">{lead.business_name}</h2>
                <p className="mt-1 text-sm text-white/45">{lead.contact_name || "No contact"}</p>
              </div>
              <select
                className={cn("rounded-full border-0 px-3 py-2 text-xs font-medium outline-none", statusStyles[lead.status])}
                value={lead.status}
                onChange={(event) => onChange(lead.id, { status: event.target.value as LeadStatus })}
              >
                {leadStatuses.map((status) => (
                  <option key={status} value={status} className="bg-zinc-950 text-white">
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-white/70">
              <textarea
                className="min-h-20 w-full resize-none rounded-2xl border border-transparent bg-transparent px-3 py-2 text-white/55 outline-none transition hover:bg-white/[0.025] focus:border-white/10 focus:bg-black/30 focus:text-white"
                value={lead.need || ""}
                onChange={(event) => onChange(lead.id, { need: event.target.value || null })}
                placeholder="Add need"
              />
              <input
                className="w-full rounded-xl border border-transparent bg-transparent px-3 py-2 text-white/55 outline-none transition hover:bg-white/[0.025] focus:border-white/10 focus:bg-black/30 focus:text-white"
                type="number"
                min="0"
                step="0.01"
                value={lead.estimated_value ?? ""}
                onChange={(event) => handleCurrencyChange(lead.id, event)}
                placeholder="Estimated value"
              />
              <textarea
                className="min-h-24 w-full resize-none rounded-2xl border border-transparent bg-transparent px-3 py-2 text-white/55 outline-none transition hover:bg-white/[0.025] focus:border-white/10 focus:bg-black/30 focus:text-white"
                value={lead.notes || ""}
                onChange={(event) => onChange(lead.id, { notes: event.target.value || null })}
                placeholder="Notes"
              />
              <div className="flex justify-between text-xs text-white/40">
                <span>{lead.created_by_name || lead.created_by_email}</span>
                <div className="flex items-center gap-2">
                  <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                  {canArchive ? (
                    <button
                      className="rounded-full p-2 text-white/35 transition hover:bg-amber-400/10 hover:text-amber-200"
                      onClick={() => onArchive(lead.id)}
                      aria-label={`Archive ${lead.business_name}`}
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
