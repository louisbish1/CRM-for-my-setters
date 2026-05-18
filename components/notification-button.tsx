"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((char) => char.charCodeAt(0)));
}

export function NotificationButton() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  async function enableNotifications() {
    setLoading(true);

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setLoading(false);
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setLoading(false);
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });

    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/push-subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token}`,
      },
      body: JSON.stringify(subscription),
    });

    if (response.ok) setEnabled(true);
    setLoading(false);
  }

  return (
    <Button variant="ghost" onClick={enableNotifications} disabled={loading || enabled}>
      <Bell className="h-4 w-4" />
      {enabled ? "Notifications on" : loading ? "Enabling..." : "Enable notifications"}
    </Button>
  );
}
