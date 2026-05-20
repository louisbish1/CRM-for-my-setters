"use client";

import { useEffect, useMemo, useState } from "react";
import { Circle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/types";

const adminEmails = new Set(["louisbish0612@gmail.com"]);

type PresencePayload = {
  user_id: string;
  name: string;
  role?: string;
  online_at: string;
};

type PresenceState = Record<string, PresencePayload[]>;

type OnlineUser = {
  id: string;
  name: string;
  role: string | undefined;
  onlineAt: string;
};

type UserStatus = {
  user_id: string;
  email: string;
  name: string | null;
  role?: string | null;
  last_seen_at: string;
};

type VisibleUser = {
  id: string;
  email: string | undefined;
  name: string;
  role: string | undefined;
  lastSeenAt: string;
  online: boolean;
};

type UserPerformance = {
  leadsAdded: number;
  closeRate: number | null;
};

function formatLastSeen(value: string) {
  const timestamp = new Date(value).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 45) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function OnlineUsers({
  currentUserId,
  userEmail,
  userLabel,
  userRole,
  leads = [],
}: {
  currentUserId: string;
  userEmail: string;
  userLabel: string;
  userRole: string;
  leads?: Lead[];
}) {
  const [open, setOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [knownUsers, setKnownUsers] = useState<UserStatus[]>([]);

  useEffect(() => {
    if (!currentUserId || !userEmail || !userLabel) return;

    let mounted = true;

    async function saveLastSeen() {
      const payload = {
        user_id: currentUserId,
        email: userEmail,
        name: userLabel,
        role: userRole,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("user_status").upsert(payload, { onConflict: "user_id" });

      if (error) {
        const { role: _role, ...payloadWithoutRole } = payload;
        await supabase.from("user_status").upsert(payloadWithoutRole, { onConflict: "user_id" });
      }
    }

    async function loadKnownUsers() {
      const { data, error } = await supabase
        .from("user_status")
        .select("user_id, email, name, role, last_seen_at")
        .order("last_seen_at", { ascending: false });

      if (!error) {
        if (mounted && data) {
          setKnownUsers(data as UserStatus[]);
        }
        return;
      }

      const { data: fallbackData } = await supabase
        .from("user_status")
        .select("user_id, email, name, last_seen_at")
        .order("last_seen_at", { ascending: false });

      if (mounted && fallbackData) {
        setKnownUsers(fallbackData as UserStatus[]);
      }
    }

    saveLastSeen();
    loadKnownUsers();

    const heartbeat = window.setInterval(() => {
      saveLastSeen();
      loadKnownUsers();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(heartbeat);
      saveLastSeen();
    };
  }, [currentUserId, userEmail, userLabel, userRole]);

  useEffect(() => {
    if (!currentUserId || !userLabel) return;

    const channel = supabase.channel("crm-online-users", {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channel.on("presence", { event: "sync" }, () => {
      setPresenceState(channel.presenceState() as PresenceState);
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;

      await channel.track({
        user_id: currentUserId,
        name: userLabel,
        role: userRole,
        online_at: new Date().toISOString(),
      });
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, userLabel, userRole]);

  const onlineUsers = useMemo(() => {
    return Object.entries(presenceState)
      .map(([id, presences]) => {
        const latestPresence = presences.reduce<PresencePayload | null>((latest, presence) => {
          if (!latest || presence.online_at > latest.online_at) return presence;
          return latest;
        }, null);

        return latestPresence
          ? {
              id,
              name: latestPresence.name || "Approved user",
              role: latestPresence.role,
              onlineAt: latestPresence.online_at,
            }
          : null;
      })
      .filter((user): user is OnlineUser => Boolean(user))
      .sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [currentUserId, presenceState]);

  const onlineCount = onlineUsers.length;
  const performanceByUser = useMemo(() => {
    const counts = leads.reduce<Map<string, { leadsAdded: number; wins: number }>>((users, lead) => {
      const current = users.get(lead.created_by_user_id) || {
        leadsAdded: 0,
        wins: 0,
      };
      const isWon = lead.status === "Won";

      users.set(lead.created_by_user_id, {
        leadsAdded: current.leadsAdded + 1,
        wins: current.wins + (isWon ? 1 : 0),
      });

      return users;
    }, new Map());

    return Array.from(counts).reduce<Map<string, UserPerformance>>((users, [userId, performance]) => {
      users.set(userId, {
        leadsAdded: performance.leadsAdded,
        closeRate: performance.leadsAdded > 0 ? Math.round((performance.wins / performance.leadsAdded) * 100) : null,
      });

      return users;
    }, new Map());
  }, [leads]);

  const visibleUsers = useMemo(() => {
    const users = new Map<string, VisibleUser>();

    knownUsers.forEach((user) => {
      users.set(user.user_id, {
        id: user.user_id,
        email: user.email,
        name: user.name || user.email || "Approved user",
        role: user.role || undefined,
        lastSeenAt: user.last_seen_at,
        online: false,
      });
    });

    onlineUsers.forEach((user) => {
      users.set(user.id, {
        id: user.id,
        email: undefined,
        name: user.name,
        role: user.role,
        lastSeenAt: user.onlineAt,
        online: true,
      });
    });

    if (!users.has(currentUserId)) {
      users.set(currentUserId, {
        id: currentUserId,
        email: userEmail,
        name: userLabel,
        role: userRole,
        lastSeenAt: new Date().toISOString(),
        online: true,
      });
    }

    return Array.from(users.values()).sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      if (a.online !== b.online) return a.online ? -1 : 1;
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
    });
  }, [currentUserId, knownUsers, onlineUsers, userEmail, userLabel, userRole]);

  if (!currentUserId) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          if (open) setActiveUserId(null);
        }}
        aria-expanded={open}
      >
        <Users className="h-4 w-4" />
        {onlineCount || 1} online
      </Button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-glow backdrop-blur-xl">
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white/35">Team status</div>
          <div className="grid gap-1">
            {visibleUsers.map((user) => {
              const performance = performanceByUser.get(user.id) || {
                leadsAdded: 0,
                closeRate: null,
              };
              const isActive = activeUserId === user.id;

              return (
                <div
                  key={user.id}
                  className={`grid rounded-xl ${isActive ? "grid-cols-[minmax(0,1fr)_8.75rem] gap-2" : "grid-cols-1"}`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveUserId((current) => (current === user.id ? null : user.id))}
                    aria-expanded={isActive}
                    className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/75 transition hover:bg-white/[0.04]"
                  >
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-white/90">{user.name}</span>
                        {user.id === currentUserId ? <span className="text-white/40"> (you)</span> : null}
                      </span>
                      <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/40">
                        <span className="shrink-0 capitalize text-white/50">
                          {user.role || (user.email && adminEmails.has(user.email.toLowerCase()) ? "admin" : "setter")}
                        </span>
                        {user.online ? "Online now" : `Last online ${formatLastSeen(user.lastSeenAt)}`}
                      </span>
                    </span>
                    <Circle
                      className={
                        user.online
                          ? "h-2.5 w-2.5 shrink-0 fill-emerald-300 text-emerald-300"
                          : "h-2.5 w-2.5 shrink-0 fill-white/25 text-white/25"
                      }
                    />
                  </button>

                  {isActive ? (
                    <div className="self-center rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2 text-xs text-white/45 shadow-glow">
                      <div className="grid gap-2">
                        <span>
                          <span className="block text-[10px] uppercase tracking-[0.16em] text-white/25">Added</span>
                          <span className="mt-0.5 block text-sm font-medium text-white/70">{performance.leadsAdded}</span>
                        </span>
                        <span>
                          <span className="block text-[10px] uppercase tracking-[0.16em] text-white/25">Close rate</span>
                          <span className="mt-0.5 block text-sm font-medium text-white/70">
                            {performance.closeRate === null ? "-" : `${performance.closeRate}%`}
                          </span>
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
