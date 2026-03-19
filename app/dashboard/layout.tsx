"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

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
      { href: "/dashboard/reviews", label: "Reviews" },
      { href: "/dashboard/settings", label: "Settings" },
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
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <aside className="fixed left-0 top-0 z-10 h-screen w-[240px] border-r border-[#222222] bg-[#0f0f0f]">
        <div className="flex h-full flex-col">
          <div className="px-5 pt-6 pb-4">
            <div className="text-base font-bold tracking-tight text-white">
              GuestPulse
            </div>
          </div>

          <nav className="flex flex-col gap-2 px-3">
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "rounded-xl px-3 py-2 text-sm transition relative",
                    active
                      ? "bg-[#1a1a1a] text-white border-l-2 border-[#6366f1] pl-[11px]"
                      : "text-[#888888] hover:bg-[#111111] hover:text-white",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto px-5 pb-6">
            <div className="mb-3 truncate text-sm font-medium text-white">
              {email ?? ""}
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="w-full rounded-[8px] bg-[#6366f1] px-5 py-[10px] text-sm font-medium text-white shadow-sm transition hover:bg-[#4f46e5]"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-[240px] min-h-screen p-6">{children}</main>
    </div>
  );
}

