import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }
    const stripe = new Stripe(stripeKey);

    const PRICE_IDS = {
      essential: process.env.STRIPE_PRICE_ESSENTIAL ?? "",
      professional: process.env.STRIPE_PRICE_PROFESSIONAL ?? "",
      business: process.env.STRIPE_PRICE_BUSINESS ?? "",
    };

    const { user_id, email, plan } = (await request.json()) as {
      user_id?: string;
      email?: string;
      plan?: string;
    };

    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url:
        process.env.NEXT_PUBLIC_APP_URL + "/dashboard?upgraded=true&plan=" + plan,
      cancel_url: process.env.NEXT_PUBLIC_APP_URL + "/dashboard/settings",
      customer_email: email,
      // Put metadata on both session and subscription so webhook can find user_id easily
      metadata: { user_id: user_id ?? "", plan: plan ?? "" },
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: user_id ?? "", plan: plan ?? "" },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
