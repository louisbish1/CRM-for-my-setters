"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Lead } from "@/lib/types";

type AddLeadDialogProps = {
  creatorLabel: string;
  onCreated: (lead: Lead) => void;
};

export function AddLeadDialog({ creatorLabel, onCreated }: AddLeadDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    phone: "",
    email: "",
    need: "",
    estimated_value: "",
    notes: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user?.email) {
      setError("Could not identify the signed-in user.");
      setLoading(false);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error || "Could not save lead.");
        setLoading(false);
        return;
      }

      onCreated(result.lead as Lead);
      setForm({ business_name: "", contact_name: "", phone: "", email: "", need: "", estimated_value: "", notes: "" });
      setLoading(false);
      setOpen(false);
    } catch {
      setError("Could not save lead.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <p className="text-sm text-white/50">Logged as {creatorLabel}</p>
        </DialogHeader>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="sm:col-span-2">
            <Input
              placeholder="Business name"
              value={form.business_name}
              onChange={(event) => setForm({ ...form, business_name: event.target.value })}
              required
            />
          </div>
          <Input placeholder="Contact name" value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <Input type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <div className="sm:col-span-2">
            <Textarea
              className="min-h-32 resize-y"
              placeholder="Lead description / need"
              value={form.need}
              onChange={(event) => setForm({ ...form, need: event.target.value })}
            />
          </div>
          <Input type="number" min="0" step="0.01" placeholder="Predicted value" value={form.estimated_value} onChange={(event) => setForm({ ...form, estimated_value: event.target.value })} />
          <div className="sm:col-span-2">
            <Textarea
              className="min-h-36 resize-y"
              placeholder="Extra notes"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </div>
          {error ? <p className="text-sm text-red-300 sm:col-span-2">{error}</p> : null}
          <div className="flex justify-end sm:col-span-2">
            <Button disabled={loading}>{loading ? "Saving..." : "Save lead"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
