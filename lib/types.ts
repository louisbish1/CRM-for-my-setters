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
  created_by_user_id: string;
  created_by_email: string;
  created_by_name: string | null;
  archived: boolean;
  created_at: string;
};
