"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const navDotColors: Record<string, string> = {
  "/dashboard": "var(--accent)",
  "/dashboard/reviews": "#34d399",
  "/dashboard/benchmarking": "#a78bfa",
  "/dashboard/settings": "#60a5fa",
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

  const nav = useMemo(
    () => [
      { href: "/dashboard", label: "Overview" },
      { href: "/dashboard/reviews", label: "Review Inbox" },
      { href: "/dashboard/benchmarking", label: "Benchmarking" },
      { href: "/dashboard/settings", label: "Settings" },
    ],
    [],
  );

  const bottomNav = useMemo(
    () => [
      { href: "/dashboard", label: "Home", icon: "⌂" },
      { href: "/dashboard/reviews", label: "Inbox", icon: "✉" },
      { href: "/dashboard/benchmarking", label: "Rank", icon: "◎" },
      { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
    ],
    [],
  );

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
      const { data: hotels } = await supabase.from("hotels").select("id").eq("user_id", user.id);
      const hotelIds = (hotels ?? []).map((h: { id: string }) => h.id).filter(Boolean);
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
    loadInboxBadge();
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

  const asideStyle: CSSProperties = {
    position: "fixed",
    left: 0,
    top: 0,
    zIndex: 10,
    height: "100vh",
    background: "var(--sidebar-bg)",
    backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",
    borderRight: "1px solid var(--sidebar-border)",
    boxShadow: "var(--sidebar-shadow)",
  };

  const secondaryBtn: CSSProperties = {
    width: "calc(100% - 24px)",
    margin: "8px 12px",
    padding: "12px 16px",
    borderRadius: "var(--btn-radius)",
    fontWeight: 500,
    fontSize: "14px",
    color: "var(--text-primary)",
    background: "var(--secondary-btn-bg)",
    border: "1px solid var(--secondary-btn-border)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <aside className="sidebar" style={asideStyle}>
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "28px 24px 20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--accent)",
                boxShadow: "var(--accent-glow)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--logo-text)",
                letterSpacing: "-0.02em",
              }}
            >
              GuestPulse
            </span>
          </div>

          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--menu-label)",
              padding: "0 24px",
              marginBottom: "8px",
            }}
          >
            MENU
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {nav.map((item) => {
              const active = isActive(item.href);
              const dotColor = navDotColors[item.href] ?? "var(--accent)";
              const linkStyle: CSSProperties = {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "11px 16px",
                margin: "2px 12px",
                borderRadius: "var(--btn-radius)",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "all 0.2s ease",
                boxShadow: active ? "inset 3px 0 0 var(--accent)" : "none",
                ...(active
                  ? {
                      background: "var(--accent-bg)",
                      border: "1px solid var(--accent-border)",
                      color: "var(--nav-active-text)",
                    }
                  : {
                      background: "transparent",
                      border: "1px solid transparent",
                      color: "var(--nav-text)",
                    }),
              };

              const showInboxBadge =
                item.href === "/dashboard/reviews" && inboxUnrespondedCount > 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={linkStyle}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "var(--glass-hover-bg)";
                      e.currentTarget.style.color = "var(--nav-text-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--nav-text)";
                    }
                  }}
                >
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: dotColor,
                      opacity: active ? 1 : 0.45,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
                  {showInboxBadge ? (
                    <span
                      style={{
                        marginLeft: "auto",
                        minWidth: "18px",
                        height: "18px",
                        padding: "0 5px",
                        borderRadius: "100px",
                        background: "#ef4444",
                        color: "#ffffff",
                        fontSize: "10px",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        lineHeight: 1,
                      }}
                    >
                      {inboxUnrespondedCount > 99 ? "99+" : inboxUnrespondedCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div style={{ marginTop: "auto", paddingBottom: "24px" }}>
            <div
              style={{
                height: "1px",
                background: "var(--divider)",
                margin: "16px 12px",
              }}
            />
            <div
              style={{
                fontSize: "13px",
                color: "var(--email-muted)",
                padding: "0 24px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={email ?? undefined}
            >
              {email ?? ""}
            </div>
            <button
              type="button"
              onClick={onLogout}
              style={secondaryBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--secondary-btn-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--secondary-btn-bg)";
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">{children}</main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {bottomNav.map((item) => {
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
                gap: "4px",
                flex: 1,
                textDecoration: "none",
                color: active ? "var(--accent)" : "var(--text-muted)",
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: "22px", lineHeight: 1, color: "inherit" }}>{item.icon}</span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  color: "inherit",
                  letterSpacing: "0.02em",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .sidebar {
              width: 260px;
            }
            .main-content {
              margin-left: 260px;
              min-height: 100vh;
              padding: 40px 48px;
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
              background: var(--sidebar-bg);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border-top: 1px solid var(--divider);
            }
            @media (min-width: 769px) and (max-width: 1024px) {
              .sidebar {
                width: 200px !important;
              }
              .main-content {
                margin-left: 200px !important;
              }
            }
            @media (max-width: 768px) {
              .sidebar {
                display: none !important;
              }
              .bottom-nav {
                display: flex !important;
              }
              .main-content {
                margin-left: 0 !important;
                padding: 20px 16px 80px !important;
              }
            }
            @media (min-width: 769px) {
              .bottom-nav {
                display: none !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
