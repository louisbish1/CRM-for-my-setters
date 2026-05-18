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
  const [error, setError] = useState<string | null>(null);

  async function enableNotifications() {
    setLoading(true);
    setError(null);

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setError("Push is not supported on this device.");
        setLoading(false);
        return;
      }

      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

      if (!standalone) {
        setError("Open the app from your Home Screen to enable notifications.");
        setLoading(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission was not granted.");
        setLoading(false);
        return;
      }

      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        }));

      const { data } = await supabase.auth.getSession();
      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token}`,
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.error || "Could not enable notifications.");
        setLoading(false);
        return;
      }

      setEnabled(true);
      setLoading(false);
    } catch {
      setError("Could not enable notifications.");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-1">
      <Button variant="ghost" onClick={enableNotifications} disabled={loading || enabled}>
        <Bell className="h-4 w-4" />
        {enabled ? "Notifications on" : loading ? "Enabling..." : "Enable notifications"}
      </Button>
      {error ? <p className="text-xs text-amber-200/80">{error}</p> : null}
    </div>
  );
}
