import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

async function getUserFromRequest(request: Request) {
  const token = getBearerToken(request);
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: approval } = await supabaseAdmin
    .from("approved_users")
    .select("email, is_admin")
    .eq("email", user.email)
    .maybeSingle();

  if (!approval?.is_admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const subscription = await request.json();
  const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      user_email: user.email,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh,
      auth: subscription.keys?.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
