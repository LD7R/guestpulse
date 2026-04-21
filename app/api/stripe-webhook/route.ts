import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// In Stripe v22, current_period_end moved from subscription to subscription item
function getPeriodEnd(sub: Stripe.Subscription): string | null {
  const ts = sub.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

// In Stripe v22, invoice.subscription moved to invoice.parent.subscription_details.subscription
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sid = invoice.parent?.subscription_details?.subscription;
  if (typeof sid === "string") return sid;
  if (sid && typeof sid === "object" && "id" in sid) return (sid as Stripe.Subscription).id;
  return null;
}

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }
  const stripe = new Stripe(stripeKey);

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.metadata?.user_id;
      const plan = session.metadata?.plan ?? null;
      const interval = session.metadata?.interval ?? null;
      if (!uid) break;

      const sub = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );

      await supabase
        .from("profiles")
        .update({
          subscription_status: sub.status === "trialing" ? "trialing" : "active",
          subscription_plan: plan,
          subscription_interval: interval,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
          subscription_id: typeof session.subscription === "string" ? session.subscription : null,
          current_period_end: getPeriodEnd(sub as unknown as Stripe.Subscription),
          trial_ends_at: sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
        })
        .eq("id", uid);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const uid = sub.metadata?.user_id;
      if (!uid) break;

      await supabase
        .from("profiles")
        .update({
          subscription_status: sub.status,
          current_period_end: getPeriodEnd(sub),
          trial_ends_at: sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
        })
        .eq("id", uid);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const uid = sub.metadata?.user_id;

      if (uid) {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "cancelled",
            subscription_plan: "free",
            subscription_interval: null,
          })
          .eq("id", uid);
      } else {
        const customerId =
          typeof sub.customer === "string" ? sub.customer : null;
        if (customerId) {
          await supabase
            .from("profiles")
            .update({
              subscription_status: "cancelled",
              subscription_plan: "free",
              subscription_interval: null,
            })
            .eq("stripe_customer_id", customerId);
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = getInvoiceSubscriptionId(invoice);
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const uid = (sub as unknown as Stripe.Subscription).metadata?.user_id;
        if (uid) {
          await supabase
            .from("profiles")
            .update({ subscription_status: "past_due" })
            .eq("id", uid);
          break;
        }
      }
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : null;
      if (customerId) {
        await supabase
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = getInvoiceSubscriptionId(invoice);
      if (invoice.billing_reason === "subscription_cycle" && subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const uid = (sub as unknown as Stripe.Subscription).metadata?.user_id;
        if (!uid) break;

        await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
            current_period_end: getPeriodEnd(sub as unknown as Stripe.Subscription),
            ai_drafts_used: 0,
            ai_drafts_reset_at: new Date().toISOString(),
          })
          .eq("id", uid);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
