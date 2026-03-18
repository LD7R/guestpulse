import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase";

import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Dashboard
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You’re signed in as{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {user.email ?? "unknown"}
              </span>
              .
            </p>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/30">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              User ID
            </p>
            <p className="mt-2 break-all font-mono text-sm text-zinc-900 dark:text-zinc-50">
              {user.id}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/30">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Provider
            </p>
            <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-50">
              {user.app_metadata?.provider ?? "email"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

