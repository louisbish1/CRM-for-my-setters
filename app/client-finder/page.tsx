"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Instagram, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

function queryParts(target: string, location: string) {
  const cleanTarget = target.trim();
  const cleanLocation = location.trim();
  return `${cleanTarget} ${cleanLocation}`.trim();
}

function searchLinks(target: string, location: string) {
  const query = queryParts(target, location) || "small business prospects";
  const cleanTarget = target.trim();
  const cleanLocation = location.trim();
  const mapsQuery = encodeURIComponent([target, location].filter(Boolean).join(" ") || query);
  const targetQuery = encodeURIComponent(cleanTarget || "small businesses");
  const locationQuery = encodeURIComponent(cleanLocation || "United Kingdom");

  return [
    {
      label: "Google Maps",
      detail: "Check local businesses nearby",
      href: `https://www.google.com/maps/search/${mapsQuery}`,
      icon: MapPin,
    },
    {
      label: "Facebook",
      detail: "Find local business pages",
      href: `https://www.facebook.com/search/pages/?q=${mapsQuery}`,
      icon: ExternalLink,
    },
    {
      label: "Instagram",
      detail: "Look for active local pages",
      href: `https://www.instagram.com/explore/search/keyword/?q=${mapsQuery}`,
      icon: Instagram,
    },
    {
      label: "Yell",
      detail: "Find UK SME directories",
      href: `https://www.yell.com/ucs/UcsSearchAction.do?keywords=${targetQuery}&location=${locationQuery}`,
      icon: ExternalLink,
    },
  ];
}

export default function ClientFinderPage() {
  const router = useRouter();
  const [target, setTarget] = useState("Dental clinic");
  const [location, setLocation] = useState("London");
  const [userLabel, setUserLabel] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      const user = sessionData.session.user;
      const { data: approval } = await supabase
        .from("approved_users")
        .select("email")
        .eq("email", user.email)
        .maybeSingle();

      if (!approval) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (mounted) {
        setUserLabel(user.user_metadata.full_name || user.email || "Approved user");
        setLoading(false);
      }
    }

    load();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  const links = useMemo(() => searchLinks(target, location), [target, location]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-6 lg:px-8">
      <header className="relative z-40 mb-4 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.05] p-4 shadow-glow backdrop-blur-xl sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="Louis Bish logo"
            width={64}
            height={64}
            className="h-14 w-14 rounded-full border border-white/10 object-cover shadow-glow"
            priority
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/35">Louis Bish internal board</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Client Find</h1>
            <p className="mt-2 text-sm text-white/50">
              {loading ? "Checking access..." : `Manual SME research for ${userLabel}`}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              CRM
            </Link>
          </Button>
        </div>
      </header>

      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] shadow-glow backdrop-blur-xl">
        <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Target clients</span>
            <Input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="Dental clinic, barber, accountant, gym"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Location</span>
            <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="London" />
          </label>
        </div>

        <div className="border-t border-white/10 bg-black/10 px-4 py-4 sm:px-5">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/35">Opportunity</p>
            <h2 className="mt-2 text-lg font-semibold text-white">{queryParts(target, location) || "Manual client search"}</h2>
            <p className="mt-2 text-sm text-white/50">
              Nothing is saved here. Use these links to research small and medium businesses yourself, then add the good ones to the CRM.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-24 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{link.label}</span>
                    <Icon className="h-4 w-4 text-white/45" />
                  </span>
                  <span className="mt-3 text-white/45">{link.detail}</span>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
