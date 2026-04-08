"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const labelStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  padding: "12px 16px 4px",
};

const navItemBase: CSSProperties = {
  padding: "7px 12px",
  margin: "1px 8px",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text-secondary)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  textDecoration: "none",
  transition: "background 0.15s ease, color 0.15s ease",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [inboxUnrespondedCount, setInboxUnrespondedCount] = useState(0);
  const [hotels, setHotels] = useState<{ id: string; name: string | null }[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    supabase.auth.getUser().then(({ data, error }) => {
      if (error) return;
      setEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    async function loadHotels() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        setHotels([]);
        return;
      }
      const { data } = await supabase.from("hotels").select("id, name").eq("user_id", user.id);
      setHotels((data ?? []) as { id: string; name: string | null }[]);
    }
    void loadHotels();
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
      const { data: hotelRows } = await supabase.from("hotels").select("id").eq("user_id", user.id);
      const hotelIds = (hotelRows ?? []).map((h: { id: string }) => h.id).filter(Boolean);
      if (hotelIds.length === 0) {
        setInboxUnrespondedCount(0);
        return;
      }
      const { count, error } = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .in("hotel_id", hotelIds)
        .eq("responded", false);
      if (error) {
        setInboxUnrespondedCount(0);
        return;
      }
      setInboxUnrespondedCount(count ?? 0);
    }
    void loadInboxBadge();
  }, [pathname]);

  async function onLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    await supabase.auth.signOut();
    router.replace("/login");
  }

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  const currentHotelLabel = useMemo(() => {
    if (hotels.length === 0) return "No property";
    if (hotels.length === 1) return hotels[0]?.name?.trim() || "Your hotel";
    return `${hotels.length} properties`;
  }, [hotels]);

  const avatarLetter = email?.trim()?.charAt(0)?.toUpperCase() ?? "?";

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
          background: active ? "var(--bg-hover)" : "transparent",
          color: active ? "var(--text-primary)" : "var(--text-secondary)",
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
              background: "var(--urgent)",
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
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
      >
        <div
          style={{
            padding: "16px 16px 8px",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>GuestPulse</span>
        </div>

        <div style={labelStyle}>Overview</div>
        <NavLink href="/dashboard" icon="▦" label="Dashboard" />

        <div style={labelStyle}>Reviews</div>
        <NavLink href="/dashboard/reviews" icon="☰" label="Review inbox" badge={inboxUnrespondedCount} />
        <NavLink href="/dashboard/reviews" icon="◷" label="Response drafts" />

        <div style={labelStyle}>Intelligence</div>
        <NavLink href="/dashboard/analytics" icon="∿" label="Sentiment trends" />
        <NavLink href="/dashboard/benchmarking" icon="◎" label="Competitors" />

        <div style={labelStyle}>Settings</div>
        <NavLink href="/dashboard/settings" icon="⚙" label="Settings" />
        <NavLink href="/dashboard/pricing" icon="◈" label="Pricing" />
        <Link
          href="/dashboard/settings"
          style={{
            ...navItemBase,
            background: "transparent",
            color: "var(--text-secondary)",
          }}
        >
          <span style={{ width: 18, textAlign: "center" }} aria-hidden>
            ✉
          </span>
          <span style={{ flex: 1 }}>Email digest</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 3,
              background: "#052e16",
              color: "#4ade80",
            }}
          >
            ON
          </span>
        </Link>

        <div style={{ marginTop: "auto", padding: "16px" }}>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
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
              color: "var(--text-muted)",
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
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 20px",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 13,
            color: "var(--text-primary)",
            minWidth: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentHotelLabel}
          </span>
          <span style={{ color: "var(--text-muted)", flexShrink: 0 }} aria-hidden>
            ▾
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
            color: "var(--text-primary)",
          }}
          title={email ?? undefined}
        >
          {avatarLetter}
        </div>
      </header>

      <main className="main-content">{children}</main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[
          { href: "/dashboard", label: "Home", icon: "▦" },
          { href: "/dashboard/reviews", label: "Inbox", icon: "☰" },
          { href: "/dashboard/benchmarking", label: "Rank", icon: "◎" },
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
                color: active ? "var(--text-primary)" : "var(--text-muted)",
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
            .main-content {
              margin-left: 220px;
              margin-top: 52px;
              padding: 24px 28px;
              min-height: calc(100vh - 52px);
              background: var(--bg-primary);
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
              background: var(--bg-secondary);
              border-top: 1px solid var(--border);
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
                padding: 20px 16px 80px !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
