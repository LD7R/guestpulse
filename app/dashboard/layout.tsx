"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import PageLoadingBar from "@/app/components/PageLoadingBar";
import TerminalSyncCard, { type SyncPlatformStatus } from "@/app/components/TerminalSyncCard";

const labelStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#555555",
  padding: "12px 16px 4px",
};

const navItemBase: CSSProperties = {
  padding: "7px 12px",
  margin: "1px 8px",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  color: "#888888",
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  textDecoration: "none",
};

type HotelSync = {
  id: string;
  name: string | null;
  tripadvisor_url: string | null;
  google_url: string | null;
  booking_url: string | null;
  first_sync_completed: boolean | null;
  last_sync_at: string | null;
  locked_until: string | null;
};

function computeInitials(fullName: string | null | undefined, email: string | null | undefined): string {
  const n = fullName?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  const e = email?.trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return "?";
}

function formatSyncTime(iso: string | null | undefined): string {
  if (!iso) return "Never synced";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Last sync: just now";
  if (diffHours < 24) return `Last sync: ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Last sync: ${diffDays}d ago`;
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  const isOnboarding = pathname === "/dashboard/onboarding";

  const [email, setEmail] = useState<string | null>(null);
  const [initials, setInitials] = useState<string>("?");
  const [inboxUnrespondedCount, setInboxUnrespondedCount] = useState(0);
  const [primaryHotel, setPrimaryHotel] = useState<HotelSync | null>(null);
  const [autoSyncing, setAutoSyncing] = useState(false);

  // Page loading bar
  const [pageLoading, setPageLoading] = useState(false);
  const prevPathname = useRef(pathname);

  // Terminal sync card
  const [syncState, setSyncState] = useState<{
    active: boolean;
    platforms: SyncPlatformStatus[];
    startTime?: number;
  }>({ active: false, platforms: [] });

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadUser() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return;
      const userEmail = data.user.email ?? null;
      setEmail(userEmail);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .maybeSingle();
      setInitials(computeInitials((profile as { full_name?: string | null } | null)?.full_name, userEmail));
    }
    void loadUser();
  }, []);

  useEffect(() => {
    async function loadHotel() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        setPrimaryHotel(null);
        return;
      }
      const { data } = await supabase
        .from("hotels")
        .select("id, name, tripadvisor_url, google_url, booking_url, first_sync_completed, last_sync_at, locked_until")
        .eq("user_id", user.id)
        .maybeSingle();
      setPrimaryHotel((data as HotelSync | null) ?? null);
    }
    void loadHotel();
  }, [pathname]);

  useEffect(() => {
    async function loadInboxBadge() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        setInboxUnrespondedCount(0);
        return;
      }
      const { data: hotel } = await supabase
        .from("hotels")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!hotel?.id) {
        setInboxUnrespondedCount(0);
        return;
      }
      const { count, error } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("hotel_id", hotel.id)
        .eq("responded", false);
      if (error) {
        setInboxUnrespondedCount(0);
        return;
      }
      setInboxUnrespondedCount(count ?? 0);
    }
    void loadInboxBadge();
  }, [pathname]);

  // Page loading bar: trigger on pathname change
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setPageLoading(true);
      const t = setTimeout(() => setPageLoading(false), 600);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  // Sync event bus listeners
  useEffect(() => {
    function onSyncStart(e: Event) {
      const detail = (e as CustomEvent<{ platforms: string[] }>).detail;
      const platforms: SyncPlatformStatus[] = (detail?.platforms ?? []).map((p) => ({
        platform: p,
        status: "syncing" as const,
      }));
      setSyncState({ active: true, platforms, startTime: Date.now() });
    }

    function onSyncProgress(e: Event) {
      const detail = (e as CustomEvent<{ platform: string; status: "done" | "error" }>).detail;
      if (!detail?.platform) return;
      setSyncState((prev) => ({
        ...prev,
        platforms: prev.platforms.map((p) =>
          p.platform === detail.platform ? { ...p, status: detail.status } : p,
        ),
      }));
    }

    function onSyncEnd(e: Event) {
      const detail = (e as CustomEvent<{ totalNew: number; errorCount: number }>).detail;
      const totalNew = detail?.totalNew ?? 0;
      const errorCount = detail?.errorCount ?? 0;

      // Show toast
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (errorCount > 0) {
        setToast({ message: `Sync finished · ${errorCount} platform${errorCount > 1 ? "s" : ""} failed`, type: "warning" });
      } else if (totalNew > 0) {
        setToast({ message: `Sync complete · ${totalNew} new review${totalNew > 1 ? "s" : ""}`, type: "success" });
      } else {
        setToast({ message: "Sync complete · No new reviews", type: "success" });
      }
      toastTimerRef.current = setTimeout(() => setToast(null), 4000);

      // Clear sync card after 2s
      setTimeout(() => setSyncState({ active: false, platforms: [] }), 2000);
    }

    window.addEventListener("gp:sync-start", onSyncStart);
    window.addEventListener("gp:sync-progress", onSyncProgress);
    window.addEventListener("gp:sync-end", onSyncEnd);
    return () => {
      window.removeEventListener("gp:sync-start", onSyncStart);
      window.removeEventListener("gp:sync-progress", onSyncProgress);
      window.removeEventListener("gp:sync-end", onSyncEnd);
    };
  }, []);

  // Auto-sync when hotel is first loaded or hotel changes
  useEffect(() => {
    if (!primaryHotel?.id) return;
    const hasUrl = primaryHotel.google_url || primaryHotel.tripadvisor_url || primaryHotel.booking_url;
    if (!hasUrl) return;
    void autoSync(primaryHotel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryHotel?.id]);

  async function autoSync(hotel: HotelSync) {
    const now = new Date();
    const lastSync = hotel.last_sync_at ? new Date(hotel.last_sync_at) : null;
    const hoursSinceSync = lastSync
      ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (hoursSinceSync < 6) return;

    const isFirstSync = !hotel.first_sync_completed;
    const syncType = isFirstSync ? "initial" : "incremental";

    setAutoSyncing(true);

    const platforms = [
      { platform: "tripadvisor", url: hotel.tripadvisor_url },
      { platform: "google", url: hotel.google_url },
      { platform: "booking", url: hotel.booking_url },
    ].filter((p): p is { platform: string; url: string } => Boolean(p.url));

    for (const p of platforms) {
      try {
        await fetch("/api/scrape-reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hotel_id: hotel.id,
            url: p.url,
            platform: p.platform,
            sync_type: syncType,
          }),
        });
      } catch (e) {
        console.error("Auto-sync failed for", p.platform, e);
      }
    }

    setAutoSyncing(false);

    if (isFirstSync) {
      try {
        await fetch("/api/classify-reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hotel_id: hotel.id }),
        });
      } catch (e) {
        console.error("Auto-classify after first sync failed", e);
      }
    }

    // Refresh hotel state to get updated last_sync_at
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from("hotels")
      .select("id, name, tripadvisor_url, google_url, booking_url, first_sync_completed, last_sync_at, locked_until")
      .eq("id", hotel.id)
      .maybeSingle();
    if (data) setPrimaryHotel(data as HotelSync);
  }

  async function onLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  const currentHotelLabel = useMemo(() => {
    if (!primaryHotel) return "No property";
    return primaryHotel.name?.trim() || "Your hotel";
  }, [primaryHotel]);

  const syncIndicator = useMemo(() => {
    if (autoSyncing) {
      return { text: "● Syncing reviews...", color: "#4ade80", pulse: true };
    }
    if (!primaryHotel) return null;
    if (!primaryHotel.last_sync_at) {
      return { text: "Not yet synced", color: "#fbbf24", pulse: false };
    }
    return { text: formatSyncTime(primaryHotel.last_sync_at), color: "#444444", pulse: false };
  }, [autoSyncing, primaryHotel]);

  const NavLink = ({
    href,
    icon,
    label,
    badge,
  }: {
    href: string;
    icon: string;
    label: string;
    badge?: number;
  }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        style={{
          ...navItemBase,
          background: active ? "#1e1e1e" : "transparent",
          color: active ? "#f0f0f0" : "#888888",
        }}
      >
        <span style={{ width: 18, textAlign: "center", opacity: 0.9 }} aria-hidden>
          {icon}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
        {badge != null && badge > 0 ? (
          <span
            style={{
              marginLeft: "auto",
              minWidth: 16,
              padding: "1px 5px",
              borderRadius: 3,
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </Link>
    );
  };

  if (isOnboarding) return <>{children}</>;

  return (
    <div style={{ minHeight: "100vh" }}>
      <aside
        className="dash-sidebar"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 20,
          width: 220,
          height: "100vh",
          background: "#111111",
          borderRight: "1px solid #1e1e1e",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
      >
        <div
          style={{
            padding: "16px 16px 8px",
            borderBottom: "1px solid #1a1a1a",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0" }}>GuestPulse</span>
        </div>

        <div style={labelStyle}>Overview</div>
        <NavLink href="/dashboard" icon="▦" label="Dashboard" />

        <div style={labelStyle}>Reviews</div>
        <NavLink href="/dashboard/reviews" icon="☰" label="Review inbox" badge={inboxUnrespondedCount} />

        <div style={labelStyle}>Intelligence</div>
        <NavLink href="/dashboard/sentiment" icon="∿" label="Sentiment trends" />
        <NavLink href="/dashboard/benchmarking" icon="◎" label="Competitors" />

        <div style={labelStyle}>Settings</div>
        <NavLink href="/dashboard/settings" icon="⚙" label="Settings" />
        <NavLink href="/dashboard/pricing" icon="◈" label="Pricing" />
        <NavLink href="/dashboard/settings" icon="✉" label="Notifications" />

        {/* Terminal sync card */}
        {syncState.active && (
          <div style={{ padding: "0 8px", marginTop: "auto" }}>
            <TerminalSyncCard
              visible={syncState.active}
              platforms={syncState.platforms}
              startTime={syncState.startTime}
            />
          </div>
        )}

        <div style={{ marginTop: syncState.active ? 0 : "auto", padding: "16px" }}>
          {primaryHotel?.locked_until &&
            new Date(primaryHotel.locked_until) > new Date() && (
              <div
                style={{
                  fontSize: 11,
                  color: "#444444",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                🔒 Hotel locked ·{" "}
                {Math.max(
                  0,
                  Math.ceil(
                    (new Date(primaryHotel.locked_until).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  ),
                )}{" "}
                days
              </div>
            )}
          {syncIndicator && (
            <div
              style={{
                fontSize: 11,
                color: syncIndicator.color,
                marginBottom: 8,
                animation: syncIndicator.pulse ? "sync-pulse 1.4s ease-in-out infinite" : "none",
              }}
            >
              {syncIndicator.text}
            </div>
          )}
          <div
            style={{
              fontSize: 12,
              color: "#555555",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: 8,
            }}
            title={email ?? undefined}
          >
            {email ?? ""}
          </div>
          <button
            type="button"
            onClick={onLogout}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 12,
              color: "#555555",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      <header
        className="dash-topbar"
        style={{
          position: "fixed",
          top: 0,
          left: 220,
          right: 0,
          zIndex: 15,
          height: 52,
          background: "#111111",
          borderBottom: "1px solid #1e1e1e",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 20px",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "#141414",
            border: "1px solid #1e1e1e",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 13,
            color: "#f0f0f0",
            minWidth: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            cursor: "default",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentHotelLabel}
          </span>
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#2a2a2a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#f0f0f0",
          }}
          title={email ?? undefined}
        >
          {initials}
        </div>
      </header>

      <main className="main-content" style={{ position: "relative" }}>
        <PageLoadingBar loading={pageLoading} />
        {children}
      </main>

      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: toast.type === "success" ? "#052e16" : "#1c1200",
            border: `1px solid ${toast.type === "success" ? "#166534" : "#3a2800"}`,
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 13,
            color: toast.type === "success" ? "#4ade80" : "#fbbf24",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            animation: "gpFadeInUp 0.25s ease",
            maxWidth: 320,
          }}
        >
          <span style={{ fontSize: 14 }}>{toast.type === "success" ? "✓" : "⚠"}</span>
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "inherit",
              opacity: 0.5,
              cursor: "pointer",
              fontSize: 14,
              padding: 0,
              lineHeight: 1,
            }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[
          { href: "/dashboard", label: "Home", icon: "▦" },
          { href: "/dashboard/reviews", label: "Inbox", icon: "☰" },
          { href: "/dashboard/sentiment", label: "Sentiment", icon: "∿" },
          { href: "/dashboard/benchmarking", label: "Benchmark", icon: "◎" },
          { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
        ].map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                flex: 1,
                textDecoration: "none",
                color: active ? "#f0f0f0" : "#555555",
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.02em" }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes sync-pulse {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 1; }
            }
            @keyframes gpFadeInUp {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .main-content {
              margin-left: 220px;
              margin-top: 52px;
              min-height: calc(100vh - 52px);
              background: #0d0d0d;
              box-sizing: border-box;
            }
            .bottom-nav {
              display: none;
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              z-index: 100;
              height: 64px;
              align-items: center;
              justify-content: space-around;
              background: #111111;
              border-top: 1px solid #1e1e1e;
            }
            @media (max-width: 768px) {
              .dash-sidebar { display: none !important; }
              .dash-topbar {
                left: 0 !important;
                margin-left: 0 !important;
              }
              .bottom-nav { display: flex !important; }
              .main-content {
                margin-left: 0 !important;
                margin-top: 52px;
                padding-bottom: 80px !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
