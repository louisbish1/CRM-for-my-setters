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

    const { data, error } = await supabase
      .from("leads")
      .insert({
        business_name: form.business_name,
        contact_name: form.contact_name || null,
        phone: form.phone || null,
        email: form.email || null,
        need: form.need || null,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        notes: form.notes || null,
        created_by_user_id: user.id,
        created_by_email: user.email,
        created_by_name: user.user_metadata.full_name || null,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    onCreated(data as Lead);
    setForm({ business_name: "", contact_name: "", phone: "", email: "", need: "", estimated_value: "", notes: "" });
    setLoading(false);
    setOpen(false);
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
          <Input placeholder="Need" value={form.need} onChange={(event) => setForm({ ...form, need: event.target.value })} />
          <Input type="number" min="0" step="0.01" placeholder="Estimated value" value={form.estimated_value} onChange={(event) => setForm({ ...form, estimated_value: event.target.value })} />
          <div className="sm:col-span-2">
            <Textarea placeholder="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
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
