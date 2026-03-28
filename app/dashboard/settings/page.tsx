"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Hotel = {
  id: string;
  user_id: string;
  name: string | null;
  tripadvisor_url: string | null;
  google_url: string | null;
  booking_url: string | null;
};

const pagePad: CSSProperties = { padding: "40px 48px" };

const glass: CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "20px",
  boxShadow:
    "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
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
  background: "rgba(99, 102, 241, 0.8)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(99, 102, 241, 0.4)",
  borderRadius: "12px",
  padding: "12px 24px",
  color: "#ffffff",
  fontWeight: 500,
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

export default function HotelSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [hotelId, setHotelId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [tripadvisorUrl, setTripadvisorUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (hotel) {
      setName(hotel.name || "");
      setTripadvisorUrl(hotel.tripadvisor_url || "");
      setGoogleUrl(hotel.google_url || "");
      setBookingUrl(hotel.booking_url || "");
    }
  }, [hotel]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("You must be signed in.");

        const { data, error: hotelError } = await supabase
          .from("hotels")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (hotelError) {
          if (hotelError.code !== "PGRST116") {
            throw hotelError;
          }
          setHotel(null);
          setHotelId(null);
          return;
        }

        const loadedHotel = (data as Hotel | null) ?? null;
        setHotel(loadedHotel);
        setHotelId(loadedHotel?.id ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load hotel settings.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You must be signed in.");

      const payload = {
        name: name.trim(),
        tripadvisor_url: tripadvisorUrl.trim() || null,
        google_url: googleUrl.trim() || null,
        booking_url: bookingUrl.trim() || null,
      };

      if (!payload.name) {
        throw new Error("Hotel name is required.");
      }

      if (hotelId) {
        const { error: updateError } = await supabase
          .from("hotels")
          .update(payload)
          .eq("id", hotelId);

        if (updateError) {
          console.error("Hotel update failed:", updateError);
          throw updateError;
        }
        setHotel((prev) =>
          prev
            ? { ...prev, ...payload }
            : {
                id: hotelId,
                user_id: user.id,
                name: payload.name,
                tripadvisor_url: payload.tripadvisor_url,
                google_url: payload.google_url,
                booking_url: payload.booking_url,
              },
        );
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("hotels")
          .insert({ ...payload, user_id: user.id })
          .select("*")
          .single();

        if (insertError) {
          console.error("Hotel insert failed:", insertError);
          throw insertError;
        }

        const insertedHotel = inserted as Hotel;
        setHotelId(insertedHotel.id);
        setHotel(insertedHotel);
      }

      setSaveSuccess("Saved successfully!");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save hotel.");
    } finally {
      setSaving(false);
    }
  }

  const label: CSSProperties = {
    display: "block",
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: "6px",
  };

  if (loading) {
    return (
      <div style={pagePad}>
        <div style={{ ...glass, padding: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.1)",
              borderTopColor: "#6366f1",
              animation: "sload 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>Loading settings…</span>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes sload { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={pagePad}>
        <div style={{ ...glass, padding: "24px", color: "#ef4444", fontSize: "14px" }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={pagePad}>
      <h1
        style={{
          fontSize: "26px",
          fontWeight: 700,
          letterSpacing: "-0.5px",
          color: "rgba(255, 255, 255, 0.92)",
          marginBottom: "24px",
        }}
      >
        Hotel settings
      </h1>

      <form onSubmit={onSubmit} style={{ ...glass, padding: "28px" }}>
        <h2
          style={{
            fontSize: "17px",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.92)",
            marginBottom: "20px",
          }}
        >
          Property details
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          <div>
            <label htmlFor="hs-name" style={label}>
              Hotel name
            </label>
            <input
              id="hs-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Boutique Hotel"
              style={glassInput}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(99, 102, 241, 0.6)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            />
          </div>
          <div>
            <label htmlFor="hs-ta" style={label}>
              TripAdvisor URL
            </label>
            <input
              id="hs-ta"
              type="url"
              value={tripadvisorUrl}
              onChange={(e) => setTripadvisorUrl(e.target.value)}
              placeholder="https://tripadvisor.com/hotel/..."
              style={glassInput}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(99, 102, 241, 0.6)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="hs-g" style={label}>
            Google Maps URL
          </label>
          <input
            id="hs-g"
            type="url"
            value={googleUrl}
            onChange={(e) => setGoogleUrl(e.target.value)}
            placeholder="https://www.google.com/maps/place/..."
            style={glassInput}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(99, 102, 241, 0.6)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="hs-b" style={label}>
            Booking.com URL
          </label>
          <input
            id="hs-b"
            type="url"
            value={bookingUrl}
            onChange={(e) => setBookingUrl(e.target.value)}
            placeholder="https://booking.com/hotel/..."
            style={glassInput}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(99, 102, 241, 0.6)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
            }}
          />
        </div>

        {saveError ? (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "12px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              fontSize: "14px",
              color: "#fca5a5",
            }}
          >
            {saveError}
          </div>
        ) : null}
        {saveSuccess ? (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "12px",
              background: "rgba(34, 197, 94, 0.08)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
              fontSize: "14px",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {saveSuccess}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              ...primaryBtn,
              opacity: saving ? 0.6 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.background = "rgba(99, 102, 241, 1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.8)";
            }}
          >
            {saving ? (hotelId ? "Updating…" : "Creating…") : hotelId ? "Save changes" : "Create hotel"}
          </button>
        </div>
      </form>
    </div>
  );
}
