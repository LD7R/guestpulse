import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const PRICES: Record<string, Record<string, string>> = {
  essential: {
    monthly: process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY!,
    annual: process.env.STRIPE_PRICE_ESSENTIAL_ANNUAL!,
  },
  professional: {
    monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY!,
    annual: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL!,
  },
  business: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY!,
    annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL!,
  },
};

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }
    const stripe = new Stripe(stripeKey);

    const { user_id, email, plan, interval } = (await request.json()) as {
      user_id?: string;
      email?: string;
      plan?: string;
      interval?: string;
    };

    const resolvedInterval = interval === "annual" ? "annual" : "monthly";
    const priceId = PRICES[plan ?? ""]?.[resolvedInterval];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan or interval" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url:
        process.env.NEXT_PUBLIC_APP_URL +
        "/dashboard?upgraded=true&plan=" +
        plan +
        "&interval=" +
        resolvedInterval,
      cancel_url: process.env.NEXT_PUBLIC_APP_URL + "/dashboard/pricing",
      customer_email: email,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: user_id ?? "", plan: plan ?? "", interval: resolvedInterval },
      },
      metadata: { user_id: user_id ?? "", plan: plan ?? "", interval: resolvedInterval },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
