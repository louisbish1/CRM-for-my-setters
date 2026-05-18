export const leadStatuses = [
  "New",
  "Contacted",
  "Interested",
  "Call Booked",
  "Won",
  "Lost",
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export type Lead = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  need: string | null;
  estimated_value: number | null;
  status: LeadStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
};
