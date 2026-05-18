import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getWebPushClient } from "@/lib/push";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

function formatPredictedValue(value: number | null) {
  if (value == null) return "";
  return ` (£${value.toLocaleString()} predicted)`;
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabaseAdmin = createSupabaseAdminClient();

  const body = await request.json();
  const payload = {
    business_name: body.business_name,
    contact_name: body.contact_name || null,
    phone: body.phone || null,
    email: body.email || null,
    need: body.need || null,
    estimated_value: body.estimated_value ? Number(body.estimated_value) : null,
    notes: body.notes || null,
    created_by_user_id: user.id,
    created_by_email: user.email,
    created_by_name: user.user_metadata.full_name || null,
  };

  const { data: lead, error } = await supabase.from("leads").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let notificationResult = {
    adminCount: 0,
    subscriptionCount: 0,
    sentCount: 0,
    failedCount: 0,
  };

  try {
    const webpush = getWebPushClient();
    const { data: adminUsers } = await supabaseAdmin
      .from("approved_users")
      .select("email")
      .eq("is_admin", true);

    const adminEmails = (adminUsers || []).map((admin) => admin.email);
    notificationResult.adminCount = adminEmails.length;
    const { data: subscriptions } = adminEmails.length
      ? await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .in("user_email", adminEmails)
      : { data: [] };
    notificationResult.subscriptionCount = subscriptions?.length || 0;

    const creatorName = payload.created_by_name || payload.created_by_email;
    const notificationBody = `${creatorName} added a new lead: ${payload.business_name}${formatPredictedValue(payload.estimated_value)}`;

    await Promise.all(
      (subscriptions || []).map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify({ title: "New lead", body: notificationBody, url: "/" }),
          );
          notificationResult.sentCount += 1;
        } catch {
          // Keep lead creation reliable even if one stored subscription has expired.
          notificationResult.failedCount += 1;
        }
      }),
    );
  } catch {
    // Lead creation should still succeed even if push is not configured yet.
  }

  return NextResponse.json({ lead, notificationResult });
}
