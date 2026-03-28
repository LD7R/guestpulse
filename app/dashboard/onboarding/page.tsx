"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";

const glassCard: CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "20px",
  boxShadow:
    "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  width: "100%",
  maxWidth: "640px",
  padding: "40px 40px",
  boxSizing: "border-box",
};

const glassInput: CSSProperties = {
  width: "100%",
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "12px",
  padding: "12px 16px",
  color: "#ffffff",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtn: CSSProperties = {
  width: "100%",
  height: "48px",
  background: "rgba(99, 102, 241, 0.8)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(99, 102, 241, 0.4)",
  borderRadius: "12px",
  color: "#ffffff",
  fontWeight: 500,
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "rgba(255, 255, 255, 0.6)",
  marginBottom: "6px",
};

export default function HotelOnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [tripadvisorUrl, setTripadvisorUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      setError("Supabase is not configured in the environment.");
      return;
    }

    const supabase = createBrowserClient(url, anonKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(userError?.message ?? "You must be signed in to continue.");
      return;
    }

    const { error: insertError } = await supabase.from("hotels").insert({
      name,
      tripadvisor_url: tripadvisorUrl || null,
      google_url: googleUrl || null,
      booking_url: bookingUrl || null,
      user_id: user.id,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    startTransition(() => {
      router.replace("/dashboard");
      router.refresh();
    });
  }

  const isSubmitting = isPending;

  const inputFocus = (el: React.FocusEvent<HTMLInputElement>) => {
    el.target.style.borderColor = "rgba(99, 102, 241, 0.6)";
  };
  const inputBlur = (el: React.FocusEvent<HTMLInputElement>) => {
    el.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 48px",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes ob-spin { to { transform: rotate(360deg) } }`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
          opacity: 0.15,
          top: "-100px",
          left: "-80px",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
          opacity: 0.1,
          bottom: "-80px",
          right: "-60px",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div style={glassCard}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#6366f1",
              boxShadow: "0 0 12px rgba(99, 102, 241, 0.8)",
            }}
          />
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.03em",
            }}
          >
            GuestPulse
          </span>
        </div>
        <h1
          style={{
            textAlign: "center",
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "rgba(255, 255, 255, 0.92)",
            marginBottom: "4px",
          }}
        >
          Hotel onboarding
        </h1>
        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "rgba(255, 255, 255, 0.4)",
            marginBottom: "36px",
            lineHeight: 1.6,
          }}
        >
          Add your hotel details to get started.
        </p>

        <form onSubmit={onSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label htmlFor="name" style={labelStyle}>
                Hotel name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Boutique Hotel"
                style={glassInput}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>
            <div>
              <label htmlFor="tripadvisor" style={labelStyle}>
                TripAdvisor URL
              </label>
              <input
                id="tripadvisor"
                type="url"
                value={tripadvisorUrl}
                onChange={(e) => setTripadvisorUrl(e.target.value)}
                placeholder="https://tripadvisor.com/hotel/..."
                style={glassInput}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="google" style={labelStyle}>
              Google Maps URL
            </label>
            <input
              id="google"
              type="url"
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              style={glassInput}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="booking" style={labelStyle}>
              Booking.com URL
            </label>
            <input
              id="booking"
              type="url"
              value={bookingUrl}
              onChange={(e) => setBookingUrl(e.target.value)}
              placeholder="https://booking.com/hotel/..."
              style={glassInput}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          {error ? (
            <div
              style={{
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "rgba(239, 68, 68, 0.95)",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...primaryBtn,
              opacity: isSubmitting ? 0.65 : 1,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = "rgba(99, 102, 241, 1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.8)";
            }}
          >
            {isSubmitting ? (
              <>
                <span
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.25)",
                    borderTopColor: "#ffffff",
                    animation: "ob-spin 0.7s linear infinite",
                  }}
                />
                Saving…
              </>
            ) : (
              "Save hotel"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
