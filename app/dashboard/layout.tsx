"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const navDotColors: Record<string, string> = {
  "/dashboard": "var(--accent)",
  "/dashboard/reviews": "#34d399",
  "/dashboard/settings": "#60a5fa",
  "/dashboard/pricing": "#a78bfa",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);

  const nav = useMemo(
    () => [
      { href: "/dashboard", label: "Overview" },
      { href: "/dashboard/reviews", label: "Review Inbox" },
      { href: "/dashboard/settings", label: "Hotel Setup" },
      { href: "/dashboard/pricing", label: "Pricing" },
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
    width: "260px",
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
      <aside style={asideStyle}>
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
                  {item.label}
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

      <main style={{ marginLeft: "260px", minHeight: "100vh", padding: 0 }}>
        {children}
      </main>
    </div>
  );
}
