"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Archive, ChevronDown } from "lucide-react";
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

const editableTextClass =
  "w-full border-0 bg-transparent p-0 text-sm text-white/65 outline-none placeholder:text-white/35 disabled:cursor-default disabled:opacity-100 focus:text-white";

type LeadTableProps = {
  leads: Lead[];
  currentUserId: string;
  onChange: (
    id: string,
    patch: Partial<
      Pick<Lead, "business_name" | "contact_name" | "phone" | "email" | "status" | "notes" | "estimated_value" | "need">
    >,
  ) => void;
  onArchive: (id: string) => void;
  canArchive: boolean;
};

export function LeadTable({ leads, currentUserId, onChange, onArchive, canArchive }: LeadTableProps) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(leads.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (expandedLeadId && !leads.some((lead) => lead.id === expandedLeadId)) {
      setExpandedLeadId(null);
    }
  }, [expandedLeadId, leads]);

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

  function compactDetail(lead: Lead) {
    return lead.contact_name || lead.email || lead.phone || "No contact details";
  }

  function canEditLead(lead: Lead) {
    return canArchive || lead.created_by_user_id === currentUserId;
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
      <div className="divide-y divide-white/10">
        {visibleLeads.map((lead) => {
          const isExpanded = expandedLeadId === lead.id;
          const isEditable = canEditLead(lead);

          return (
            <article key={lead.id} className="transition hover:bg-white/[0.025]">
              <div
                className="flex w-full items-center gap-3 px-4 py-4 text-left sm:px-5"
                onClick={() => setExpandedLeadId((current) => (current === lead.id ? null : lead.id))}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setExpandedLeadId((current) => (current === lead.id ? null : lead.id));
                  }
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    {isExpanded && isEditable ? (
                      <input
                        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base font-medium text-white outline-none"
                        value={lead.business_name}
                        onChange={(event) => onChange(lead.id, { business_name: event.target.value })}
                        onClick={(event) => event.stopPropagation()}
                        aria-label="Lead name"
                      />
                    ) : (
                      <span className="truncate text-base font-medium text-white">{lead.business_name}</span>
                    )}
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", statusStyles[lead.status])}>
                      {lead.status}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-sm text-white/45">{compactDetail(lead)}</span>
                </span>
                <span className="hidden text-sm text-white/45 sm:block">
                  {lead.estimated_value ? `£${lead.estimated_value.toLocaleString()}` : "No value"}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-white/40 transition",
                    isExpanded ? "rotate-180 text-white/70" : null,
                  )}
                />
              </div>

              {isExpanded ? (
              <div className="grid gap-4 border-t border-white/10 bg-black/20 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
                <div className="grid gap-3 sm:col-span-2 lg:col-span-1">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Contact</p>
                    <div className="mt-2 grid gap-1 text-sm text-white/65">
                      <input
                        className={editableTextClass}
                        value={lead.contact_name || ""}
                        onChange={(event) => onChange(lead.id, { contact_name: event.target.value || null })}
                        placeholder="No contact name"
                        disabled={!isEditable}
                        aria-label="Contact name"
                      />
                      <input
                        className={editableTextClass}
                        value={lead.phone || ""}
                        onChange={(event) => onChange(lead.id, { phone: event.target.value || null })}
                        placeholder="No phone"
                        disabled={!isEditable}
                        aria-label="Phone"
                      />
                      <input
                        className={cn(editableTextClass, "break-all")}
                        type="email"
                        value={lead.email || ""}
                        onChange={(event) => onChange(lead.id, { email: event.target.value || null })}
                        placeholder="No email"
                        disabled={!isEditable}
                        aria-label="Email"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Created</p>
                    <p className="mt-2 text-sm text-white/55">
                      {new Date(lead.created_at).toLocaleDateString()} by {creatorLabel(lead)}
                    </p>
                  </div>
                </div>

                <label className="grid gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Predicted value</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 outline-none transition disabled:cursor-not-allowed disabled:opacity-45 focus:border-white/20 focus:bg-black/30 focus:text-white"
                    type="number"
                    min="0"
                    step="0.01"
                    value={lead.estimated_value ?? ""}
                    onChange={(event) => handleCurrencyChange(lead.id, event)}
                    placeholder="Add value"
                    disabled={!isEditable}
                  />
                </label>

                <label className="grid content-start gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Status</span>
                  <select
                    className={cn(
                      "w-fit rounded-full border-0 px-3 py-2 text-xs font-medium outline-none disabled:cursor-not-allowed disabled:opacity-55",
                      statusStyles[lead.status],
                    )}
                    value={lead.status}
                    onChange={(event) => onChange(lead.id, { status: event.target.value as LeadStatus })}
                    disabled={!isEditable}
                  >
                    {leadStatuses.map((status) => (
                      <option key={status} value={status} className="bg-zinc-950 text-white">
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Lead description</span>
                  <textarea
                    className="min-h-36 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/70 outline-none transition disabled:cursor-not-allowed disabled:resize-none disabled:opacity-45 focus:border-white/20 focus:bg-black/30 focus:text-white"
                    value={lead.need || ""}
                    onChange={(event) => onChange(lead.id, { need: event.target.value || null })}
                    placeholder="Add description"
                    disabled={!isEditable}
                  />
                </label>

                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Notes</span>
                  <textarea
                    className="min-h-36 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/70 outline-none transition disabled:cursor-not-allowed disabled:resize-none disabled:opacity-45 focus:border-white/20 focus:bg-black/30 focus:text-white"
                    value={lead.notes || ""}
                    onChange={(event) => onChange(lead.id, { notes: event.target.value || null })}
                    placeholder="Add notes"
                    disabled={!isEditable}
                  />
                </label>

                {canArchive ? (
                  <div className="flex justify-end sm:col-span-2 lg:col-span-4">
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-white/45 transition hover:bg-amber-400/10 hover:text-amber-200"
                      onClick={() => onArchive(lead.id)}
                      aria-label={`Archive ${lead.business_name}`}
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                  </div>
                ) : null}
              </div>
              ) : null}
            </article>
          );
        })}
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
