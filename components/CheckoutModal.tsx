"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PLAN_PRICES: Record<string, Record<string, number>> = {
  essential: { monthly: 99, annual: 83 },
  professional: { monthly: 199, annual: 166 },
  business: { monthly: 399, annual: 332 },
};

const PLAN_NAMES: Record<string, string> = {
  essential: "Essential",
  professional: "Professional",
  business: "Multi-property",
};

const CARD_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, Inter, sans-serif";

interface CheckoutModalProps {
  plan: string;
  interval: "monthly" | "annual";
  onClose: () => void;
  onSuccess: () => void;
}

// ── Inner form component (needs Stripe context) ────────────────────────────

function CheckoutForm({
  plan,
  interval,
  clientSecret,
  onClose,
  onSuccess,
}: {
  plan: string;
  interval: "monthly" | "annual";
  clientSecret: string;
  subscriptionId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  const price = PLAN_PRICES[plan]?.[interval] ?? 0;
  const planName = PLAN_NAMES[plan] ?? plan;
  const annualTotal = interval === "annual" ? price * 12 : null;

  const cardElementStyle = {
    style: {
      base: {
        fontSize: "14px",
        color: "#f0f0f0",
        fontFamily: CARD_FONT_FAMILY,
        "::placeholder": { color: "#444444" },
        backgroundColor: "transparent",
      },
      invalid: { color: "#f87171" },
    },
  };

  const trialEndDate = new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError(null);

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) {
      setLoading(false);
      return;
    }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardNumber,
        billing_details: { name },
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed");
      setLoading(false);
      return;
    }

    if (
      paymentIntent?.status === "succeeded" ||
      paymentIntent?.status === "requires_action" ||
      paymentIntent?.status === "processing"
    ) {
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      {/* Plan summary */}
      <div
        style={{
          background: "#111111",
          border: "1px solid #1e1e1e",
          borderRadius: 6,
          padding: "12px 14px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f0" }}>
              GuestPulse {planName}
            </div>
            <div style={{ fontSize: 11, color: "#555555", marginTop: 2 }}>
              {interval === "annual" ? "Annual billing" : "Monthly billing"} · 7-day free trial
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f0f0f0" }}>${price}/mo</div>
            {annualTotal && (
              <div style={{ fontSize: 11, color: "#555555" }}>${annualTotal}/yr</div>
            )}
          </div>
        </div>
      </div>

      {/* 7-day trial notice */}
      <div
        style={{
          background: "#0a1a0a",
          border: "1px solid #1a3a1a",
          borderRadius: 6,
          padding: "10px 14px",
          marginBottom: 20,
          fontSize: 12,
          color: "#4ade80",
        }}
      >
        Your 7-day free trial starts today. You won&apos;t be charged until {trialEndDate}.
      </div>

      {/* Cardholder name */}
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color: "#555555",
            display: "block",
            marginBottom: 6,
          }}
        >
          Cardholder name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={{
            width: "100%",
            background: "#111111",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 14,
            color: "#f0f0f0",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#3a3a3a"; }}
          onBlur={(e) => { e.target.style.borderColor = "#2a2a2a"; }}
        />
      </div>

      {/* Card number */}
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color: "#555555",
            display: "block",
            marginBottom: 6,
          }}
        >
          Card number
        </label>
        <div
          style={{
            background: "#111111",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            padding: "11px 12px",
          }}
        >
          <CardNumberElement options={cardElementStyle} />
        </div>
      </div>

      {/* Expiry + CVC */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <label
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "#555555",
              display: "block",
              marginBottom: 6,
            }}
          >
            Expiry date
          </label>
          <div
            style={{
              background: "#111111",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              padding: "11px 12px",
            }}
          >
            <CardExpiryElement options={cardElementStyle} />
          </div>
        </div>
        <div>
          <label
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "#555555",
              display: "block",
              marginBottom: 6,
            }}
          >
            CVC
          </label>
          <div
            style={{
              background: "#111111",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              padding: "11px 12px",
            }}
          >
            <CardCvcElement options={cardElementStyle} />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#1a0a0a",
            border: "1px solid #2a1a1a",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 13,
            color: "#f87171",
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !stripe}
        style={{
          width: "100%",
          background: loading ? "#888888" : "#f0f0f0",
          color: "#0d0d0d",
          border: "none",
          borderRadius: 6,
          padding: "12px",
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.background = "#e0e0e0";
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.background = "#f0f0f0";
        }}
      >
        {loading ? "Processing..." : "Start 7-day free trial"}
      </button>

      {/* Security note */}
      <div
        style={{
          textAlign: "center",
          marginTop: 12,
          fontSize: 11,
          color: "#444444",
        }}
      >
        Secured by Stripe · Cancel anytime
      </div>
    </form>
  );
}

// ── Outer modal component ──────────────────────────────────────────────────

export default function CheckoutModal({
  plan,
  interval,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  const planName = PLAN_NAMES[plan] ?? plan;
  const price = PLAN_PRICES[plan]?.[interval] ?? 0;

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/signup?plan=" + plan + "&interval=" + interval);
          return;
        }

        const res = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            email: user.email,
            plan,
            interval,
          }),
        });
        const data = (await res.json()) as {
          clientSecret?: string;
          subscriptionId?: string;
          error?: string;
        };

        if (data.error) {
          setInitError(data.error);
          return;
        }

        setClientSecret(data.clientSecret ?? null);
        setSubscriptionId(data.subscriptionId ?? null);
      } catch {
        setInitError("Failed to initialize checkout");
      } finally {
        setInitializing(false);
      }
    };
    void init();
  }, [plan, interval, router]);

  const handleSuccess = () => {
    onSuccess();
    router.push("/dashboard?upgraded=true&plan=" + plan + "&interval=" + interval);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#141414",
          border: "1px solid #1e1e1e",
          borderRadius: 8,
          padding: "28px",
          width: "100%",
          maxWidth: "440px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0" }}>
              Subscribe to {planName}
            </div>
            <div style={{ fontSize: 12, color: "#555555", marginTop: 2 }}>
              7-day free trial, then ${price}/mo
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#555555",
              fontSize: 20,
              cursor: "pointer",
              padding: "4px 8px",
              lineHeight: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f0f0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#555555"; }}
          >
            ×
          </button>
        </div>

        {/* Loading state */}
        {initializing && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "#555555",
              fontSize: 13,
            }}
          >
            Setting up checkout...
          </div>
        )}

        {/* Error state */}
        {initError && (
          <div
            style={{
              background: "#1a0a0a",
              border: "1px solid #2a1a1a",
              borderRadius: 6,
              padding: "14px",
              color: "#f87171",
              fontSize: 13,
            }}
          >
            {initError}
          </div>
        )}

        {/* Stripe form */}
        {clientSecret && !initializing && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "night",
                variables: {
                  colorBackground: "#111111",
                  colorText: "#f0f0f0",
                  colorDanger: "#f87171",
                  borderRadius: "6px",
                  fontFamily: CARD_FONT_FAMILY,
                },
              },
            }}
          >
            <CheckoutForm
              plan={plan}
              interval={interval}
              clientSecret={clientSecret}
              subscriptionId={subscriptionId ?? ""}
              onClose={onClose}
              onSuccess={handleSuccess}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
