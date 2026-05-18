"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
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
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(leads.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const visibleLeads = useMemo(
    () => leads.slice((page - 1) * pageSize, page * pageSize),
    [leads, page],
  );

  function handleCurrencyChange(id: string, event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    onChange(id, { estimated_value: value ? Number(value) : null });
  }

  function creatorLabel(lead: Lead) {
    return lead.created_by_name || lead.created_by_email;
  }

  if (!leads.length) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-10 text-center shadow-glow backdrop-blur-xl">
        <p className="text-lg font-medium">No leads yet</p>
        <p className="mt-2 text-sm text-white/50">Add the first lead to start the board.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] shadow-glow backdrop-blur-xl">
      <div className="hidden max-h-[68vh] overflow-auto md:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/95 text-xs uppercase tracking-[0.2em] text-white/35 backdrop-blur-xl">
            <tr>
              <th className="px-5 py-4">Business</th>
              <th className="px-5 py-4">Contact</th>
              <th className="px-5 py-4">Need</th>
              <th className="px-5 py-4">Predicted value</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Notes</th>
              <th className="px-5 py-4">Created by</th>
              <th className="px-5 py-4">Created</th>
              {canArchive ? <th className="px-5 py-4"></th> : null}
            </tr>
          </thead>
          <tbody>
            {visibleLeads.map((lead) => (
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
                  <div>Added by {creatorLabel(lead)}</div>
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
        {visibleLeads.map((lead) => (
          <article key={lead.id} className="rounded-[28px] border border-white/10 bg-black/20 p-4 shadow-sm">
            <div className="grid gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">Business</p>
                <h2 className="mt-2 text-base font-medium">{lead.business_name}</h2>
              </div>

              <div className="grid gap-3 rounded-3xl border border-white/8 bg-white/[0.02] p-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Contact</p>
                  <div className="mt-2 grid gap-1 text-sm text-white/65">
                    <span>{lead.contact_name || "No contact name"}</span>
                    <span>{lead.phone || "No phone"}</span>
                    <span className="truncate">{lead.email || "No email"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Predicted value</p>
                  <input
                    className="mt-2 w-full rounded-xl border border-transparent bg-transparent p-0 text-sm text-white/65 outline-none transition hover:bg-white/[0.025] focus:border-white/10 focus:bg-black/30 focus:px-3 focus:py-2 focus:text-white"
                    type="number"
                    min="0"
                    step="0.01"
                    value={lead.estimated_value ?? ""}
                    onChange={(event) => handleCurrencyChange(lead.id, event)}
                    placeholder="Add value"
                  />
                </div>

                <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Status</p>
                  <select
                    className={cn("mt-2 rounded-full border-0 px-3 py-2 text-xs font-medium outline-none", statusStyles[lead.status])}
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
              </div>

              <div className="grid gap-4">
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Need</p>
                  <textarea
                    className="min-h-20 w-full resize-none rounded-2xl border border-transparent bg-white/[0.02] px-3 py-3 text-white/55 outline-none transition hover:bg-white/[0.03] focus:border-white/10 focus:bg-black/30 focus:text-white"
                    value={lead.need || ""}
                    onChange={(event) => onChange(lead.id, { need: event.target.value || null })}
                    placeholder="Add need"
                  />
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Notes</p>
                  <textarea
                    className="min-h-24 w-full resize-none rounded-2xl border border-transparent bg-white/[0.02] px-3 py-3 text-white/55 outline-none transition hover:bg-white/[0.03] focus:border-white/10 focus:bg-black/30 focus:text-white"
                    value={lead.notes || ""}
                    onChange={(event) => onChange(lead.id, { notes: event.target.value || null })}
                    placeholder="Notes"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 items-start gap-4 border-t border-white/8 pt-4 text-xs text-white/45">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">Added by</p>
                  <p className="mt-2 text-white/55">Added by {creatorLabel(lead)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">Created</p>
                  <div className="mt-2 flex items-center justify-end gap-2">
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
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-white/10 px-4 py-2 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <button
              className="rounded-full border border-white/10 px-4 py-2 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
