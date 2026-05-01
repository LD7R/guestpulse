/**
 * Test account utilities — client-safe (no server secrets).
 * A "test account" can bypass Stripe and switch plans freely.
 * Identify via env allowlist OR the is_test_account DB flag.
 */

const TEST_EMAILS = (process.env.NEXT_PUBLIC_TEST_ACCOUNT_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export type PlanKey = "essential" | "professional" | "multi_property";

export const PLAN_LIMITS: Record<PlanKey, { label: string; aiDrafts: number; properties: number }> = {
  essential: { label: "Essential", aiDrafts: 10, properties: 1 },
  professional: { label: "Professional", aiDrafts: -1 /* unlimited */, properties: 1 },
  multi_property: { label: "Multi-property", aiDrafts: -1, properties: 10 },
};

/**
 * Returns true if this user should bypass Stripe and get full access.
 * Works client-side — uses public env var + optional DB flag.
 */
export function isTestAccount(
  user: { email?: string | null } | null | undefined,
  profile?: { is_test_account?: boolean | null } | null,
): boolean {
  if (profile?.is_test_account === true) return true;
  const email = user?.email?.toLowerCase() ?? "";
  if (!email) return false;
  return TEST_EMAILS.includes(email);
}

/**
 * Test accounts always get multi_property plan in effect.
 * Real plan stored in DB is kept as-is (so reverting is easy).
 */
export function getEffectivePlan(
  isTest: boolean,
  storedPlan: string | null | undefined,
): PlanKey {
  if (isTest) return "multi_property";
  const p = storedPlan ?? "";
  if (p === "essential" || p === "professional" || p === "multi_property") return p;
  return "professional";
}
