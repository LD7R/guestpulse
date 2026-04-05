import { redirect } from "next/navigation";

/** Placeholder route: Stripe checkout will target `/dashboard/pricing`; until then, send users to Settings. */
export default function PricingRedirectPage() {
  redirect("/dashboard/settings");
}
