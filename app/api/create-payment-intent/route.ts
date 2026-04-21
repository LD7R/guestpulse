import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
    const { user_id, email, plan, interval } = (await request.json()) as {
      user_id?: string;
      email?: string;
      plan?: string;
      interval?: string;
    };

    if (!user_id || !plan || !interval) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const resolvedInterval = interval === "annual" ? "annual" : "monthly";
    const priceId = PRICES[plan]?.[resolvedInterval];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // Create or retrieve Stripe customer
    let customerId: string;
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user_id)
      .single();

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id as string;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { user_id },
      });
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user_id);
    }

    // Create subscription with trial and payment_behavior: 'default_incomplete'
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      trial_period_days: 7,
      expand: ["latest_invoice.payment_intent"],
      metadata: { user_id, plan, interval: resolvedInterval },
    });

    // Stripe v22: cast through unknown to access expanded payment_intent
    const invoice = subscription.latest_invoice as unknown as Record<string, unknown>;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | null;

    // Save subscription ID immediately
    await supabase
      .from("profiles")
      .update({
        subscription_id: subscription.id,
        subscription_plan: plan,
        subscription_interval: resolvedInterval,
        subscription_status: "trialing",
      })
      .eq("id", user_id);

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret ?? null,
      customerId,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
