import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-64 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="mt-8 space-y-4">
          <div className="h-11 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-11 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-11 w-full rounded-xl bg-zinc-900/20 dark:bg-zinc-50/20" />
        </div>
      </div>
    </div>
  );
}

