# Setter Lead Tracker

Minimal internal lead board built with Next.js, TypeScript, Tailwind, shadcn-style UI primitives, and Supabase.

## Setup

1. Copy `.env.example` to `.env.local`
2. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Run the SQL in `supabase/schema.sql` inside Supabase SQL editor.
4. Add approved users manually to `public.approved_users`.
5. Create matching Supabase Auth users with email/password.
6. Install dependencies and run the app:

```bash
npm install
npm run dev
```

## Scope

Included:
- email/password login
- approved-user-only data access via RLS
- one lead dashboard
- add lead modal
- editable status, notes, and estimated value
- automatic creator attribution from the signed-in user

Intentionally excluded:
- analytics
- automations
- notifications
- messaging
- complex permissions
- multi-page CRM workflows
