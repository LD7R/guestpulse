/**
 * Server-side test account check — safe to use in API routes.
 * Checks the DB flag AND the server-side env allowlist.
 * Note: NEXT_PUBLIC_ vars are also available server-side.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function isUserTestAccount(
  userId: string,
  email: string | null | undefined,
): Promise<boolean> {
  // Check email allowlist first (no DB hit needed)
  const testEmails = (process.env.NEXT_PUBLIC_TEST_ACCOUNT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (email && testEmails.includes(email.toLowerCase())) return true;

  // Fall back to DB flag
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {}
          },
        },
      },
    );

    const { data } = await supabase
      .from("profiles")
      .select("is_test_account")
      .eq("id", userId)
      .maybeSingle();

    return (data as { is_test_account?: boolean | null } | null)?.is_test_account === true;
  } catch {
    return false;
  }
}
