// Run in Supabase:
// alter table public.hotels
// add column if not exists locked_until timestamp with time zone,
// add column if not exists lock_started_at timestamp with time zone;
//
// alter table public.hotels
// add column if not exists active_platforms jsonb
//   default '{"tripadvisor":true,"google":true,"booking":true,"trip":false,"expedia":false,"yelp":false}';

"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

type ProfileRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_initials: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  stripe_customer_id: string | null;
};

type HotelRow = {
  id: string;
  user_id: string;
  name: string | null;
  tripadvisor_url: string | null;
  google_url: string | null;
  booking_url: string | null;
  trip_url: string | null;
  expedia_url: string | null;
  yelp_url: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
  response_signature: string | null;
  room_count: number | null;
  latitude: number | null;
  longitude: number | null;
  active_platforms: unknown;
  locked_until: string | null;
  lock_started_at: string | null;
};

type ActivePlatforms = {
  tripadvisor: boolean;
  google: boolean;
  booking: boolean;
  trip: boolean;
  expedia: boolean;
  yelp: boolean;
};

type HotelSearchResult = {
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  website: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  google_url: string | null;
  avg_rating: number | null;
  total_reviews: number | null;
  tripadvisor_url: string | null;
  booking_url: string | null;
  yelp_url: string | null;
  trip_url: string | null;
  expedia_url: string | null;
  url_confidence: Record<string, "verified" | "search_page" | "not_found">;
};

const glass: CSSProperties = {
  background: "#141414",
  border: "1px solid #1e1e1e",
  borderRadius: "8px",
};

const glassInput: CSSProperties = {
  width: "100%",
  background: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: "6px",
  padding: "12px 16px",
  color: "#f0f0f0",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtn: CSSProperties = {
  background: "#f0f0f0",
  border: "none",
  borderRadius: "6px",
  padding: "7px 14px",
  color: "#0d0d0d",
  fontWeight: 600,
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#888888",
  marginBottom: "6px",
};

const tabBar: CSSProperties = {
  display: "flex",
  gap: 0,
  background: "transparent",
  border: "none",
  borderBottom: "1px solid #1e1e1e",
  padding: 0,
  marginBottom: "32px",
};

function computeInitials(fullName: string | null | undefined, email: string | null | undefined): string {
  const n = fullName?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  const e = email?.trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return "?";
}

type ToastState = { type: "success" | "error"; message: string } | null;

function Skeleton({
  width = "100%",
  height = "20px",
  radius = "8px",
  style,
}: {
  width?: string;
  height?: string;
  radius?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: "#1a1a1a",
        border: "1px solid #1e1e1e",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: "44px",
        height: "24px",
        borderRadius: "100px",
        border: "none",
        padding: 0,
        cursor: "pointer",
        background: checked ? "#4ade80" : "#2a2a2a",
        transition: "background 0.2s ease",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "2px",
          left: checked ? "22px" : "2px",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"account" | "hotel" | "billing" | "notifications">(
    "account",
  );

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [hotel, setHotel] = useState<HotelRow | null>(null);
  const [hotelId, setHotelId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [responseSignature, setResponseSignature] = useState("The Management Team");

  const [hotelName, setHotelName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [roomCount, setRoomCount] = useState<string>("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [tripadvisorUrl, setTripadvisorUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [tripUrl, setTripUrl] = useState("");
  const [expediaUrl, setExpediaUrl] = useState("");
  const [yelpUrl, setYelpUrl] = useState("");

  // Hotel search state
  const [searchName, setSearchName] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(0);
  const [searchResult, setSearchResult] = useState<HotelSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editingUrls, setEditingUrls] = useState<Record<string, boolean>>({});
  const [editedUrls, setEditedUrls] = useState<Record<string, string>>({});

  // Active platforms
  const [activePlatforms, setActivePlatforms] = useState<ActivePlatforms>({
    tripadvisor: true,
    google: true,
    booking: true,
    trip: false,
    expedia: false,
    yelp: false,
  });

  const [autoFillMsg, setAutoFillMsg] = useState<string | null>(null);

  const [savingAccount, setSavingAccount] = useState(false);
  const [savingHotel, setSavingHotel] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [notifications, setNotifications] = useState({
    newReviews: true,
    urgentAlerts: true,
    weeklyDigest: true,
    monthlyReport: false,
    syncReminders: true,
  });

  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), type === "success" ? 3000 : 5000);
  }, []);

  const isLocked = useMemo(() => {
    return !!(hotel?.locked_until && new Date(hotel.locked_until) > new Date());
  }, [hotel]);

  const daysRemaining = useMemo(() => {
    if (!hotel?.locked_until) return 0;
    const diff = new Date(hotel.locked_until).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [hotel]);

  const lockedUntilFormatted = useMemo(() => {
    if (!hotel?.locked_until) return "";
    return new Date(hotel.locked_until).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
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

        setUserId(user.id);
        setUserEmail(user.email ?? null);

        const [profileRes, hotelRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase.from("hotels").select("*").eq("user_id", user.id).maybeSingle(),
        ]);

        if (profileRes.error && profileRes.error.code !== "PGRST116") {
          throw profileRes.error;
        }
        const p = profileRes.data as ProfileRow | null;
        setProfile(p);
        setFullName(p?.full_name ?? "");
        setDisplayName(p?.display_name ?? "");

        if (hotelRes.error) {
          if (hotelRes.error.code !== "PGRST116") throw hotelRes.error;
          setHotel(null);
          setHotelId(null);
        } else {
          const h = hotelRes.data as HotelRow | null;
          setHotel(h);
          setHotelId(h?.id ?? null);
          if (h) {
            setHotelName(h.name || "");
            setPhone(h.phone || "");
            setWebsite(h.website || "");
            setRoomCount(h.room_count != null ? String(h.room_count) : "");
            setAddress(h.address || "");
            setCity(h.city || "");
            setCountry(h.country || "");
            setPostalCode(h.postal_code || "");
            setTripadvisorUrl(h.tripadvisor_url || "");
            setGoogleUrl(h.google_url || "");
            setBookingUrl(h.booking_url || "");
            setTripUrl(h.trip_url || "");
            setExpediaUrl(h.expedia_url || "");
            setYelpUrl(h.yelp_url || "");
            setResponseSignature(h.response_signature?.trim() || "The Management Team");
            if (h.active_platforms) {
              try {
                const ap =
                  typeof h.active_platforms === "string"
                    ? (JSON.parse(h.active_platforms) as ActivePlatforms)
                    : (h.active_platforms as ActivePlatforms);
                setActivePlatforms((prev) => ({ ...prev, ...ap }));
              } catch {
                // keep defaults
              }
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function onSaveAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    setSavingAccount(true);
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

      const initials = computeInitials(fullName, user.email);

      const { error: upErr } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: fullName.trim() || null,
          display_name: displayName.trim() || null,
          avatar_initials: initials,
        },
        { onConflict: "id" },
      );
      if (upErr) throw upErr;

      setProfile((prev) => ({
        id: user.id,
        full_name: fullName.trim() || null,
        display_name: displayName.trim() || null,
        avatar_initials: initials,
        subscription_status: prev?.subscription_status ?? null,
        subscription_plan: prev?.subscription_plan ?? null,
        stripe_customer_id: prev?.stripe_customer_id ?? null,
      }));

      if (hotelId) {
        const { error: hErr } = await supabase
          .from("hotels")
          .update({ response_signature: responseSignature.trim() || "The Management Team" })
          .eq("id", hotelId);
        if (hErr) throw hErr;
        setHotel((prev) =>
          prev
            ? {
                ...prev,
                response_signature: responseSignature.trim() || "The Management Team",
              }
            : prev,
        );
      }

      showToast("success", "Account updated successfully");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save account.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function onSaveHotel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingHotel(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!hotelName.trim()) throw new Error("Hotel name is required.");

      const { data: existing } = await supabase
        .from("hotels")
        .select("id, locked_until")
        .eq("user_id", user.id)
        .maybeSingle();

      const roomsParsed = roomCount.trim() === "" ? null : parseInt(roomCount, 10);
      const room_count = roomsParsed !== null && !Number.isNaN(roomsParsed) ? roomsParsed : null;

      const now = Date.now();
      const lockUntil = new Date(now + 28 * 24 * 60 * 60 * 1000).toISOString();
      const lockStartedAt = new Date(now).toISOString();

      // Fields that are always editable
      const alwaysEditable: Record<string, unknown> = {
        address: address.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        postal_code: postalCode.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        response_signature: responseSignature.trim() || "The Management Team",
        active_platforms: activePlatforms,
      };

      // Fields locked after first save
      const lockedFields: Record<string, unknown> = {
        name: hotelName.trim(),
        tripadvisor_url: tripadvisorUrl.trim() || null,
        google_url: googleUrl.trim() || null,
        booking_url: bookingUrl.trim() || null,
        trip_url: tripUrl.trim() || null,
        expedia_url: expediaUrl.trim() || null,
        yelp_url: yelpUrl.trim() || null,
        room_count,
      };

      const coordMatch = googleUrl?.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        lockedFields.latitude = parseFloat(coordMatch[1]!);
        lockedFields.longitude = parseFloat(coordMatch[2]!);
      }

      let hotelData: Record<string, unknown>;
      let saveError;

      if (!existing?.id) {
        // New hotel — full insert with lock
        hotelData = {
          ...alwaysEditable,
          ...lockedFields,
          user_id: user.id,
          locked_until: lockUntil,
          lock_started_at: lockStartedAt,
        };
        const result = await supabase.from("hotels").insert(hotelData);
        saveError = result.error;
      } else {
        const existingLocked = !!(
          existing.locked_until &&
          new Date(existing.locked_until as string) > new Date()
        );

        if (existingLocked) {
          // Only save unlocked fields
          hotelData = { ...alwaysEditable };
        } else {
          // Lock expired — full update + new lock
          hotelData = {
            ...alwaysEditable,
            ...lockedFields,
            locked_until: lockUntil,
            lock_started_at: lockStartedAt,
          };
        }
        const result = await supabase.from("hotels").update(hotelData).eq("user_id", user.id);
        saveError = result.error;

        // Refresh hotel state to reflect new locked_until
        if (!saveError) {
          const { data: refreshed } = await supabase
            .from("hotels")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          if (refreshed) setHotel(refreshed as HotelRow);
        }
      }

      if (saveError) {
        console.error("Hotel save error:", JSON.stringify(saveError));
        showToast("error", "Failed to save hotel: " + saveError.message);
        return;
      }

      showToast("success", "✓ Settings saved");
    } catch (err) {
      console.error("Hotel save error:", JSON.stringify(err, null, 2));
      showToast("error", err instanceof Error ? err.message : "Failed to save hotel.");
    } finally {
      setSavingHotel(false);
    }
  }

  async function runHotelSearch() {
    if (!searchName.trim()) return;
    setSearching(true);
    setSearchStep(0);
    setSearchResult(null);
    setSearchError(null);

    const stepTimer = window.setInterval(() => {
      setSearchStep((s) => Math.min(s + 1, 2));
    }, 1200);

    try {
      const res = await fetch("/api/search-hotel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel_name: searchName.trim(),
          city: searchCity.trim() || undefined,
        }),
      });
      const data = (await res.json()) as
        | { success: true; hotel: HotelSearchResult }
        | { success: false; error: string };

      if (data.success) {
        const h = data.hotel;
        setSearchResult(h);
        setEditedUrls({
          tripadvisor: h.tripadvisor_url ?? "",
          google: h.google_url ?? "",
          booking: h.booking_url ?? "",
          trip: h.trip_url ?? "",
          expedia: h.expedia_url ?? "",
          yelp: h.yelp_url ?? "",
        });

        // Immediately auto-fill all form fields
        if (!isLocked) {
          if (h.name) setHotelName(h.name);
          setTripadvisorUrl(h.tripadvisor_url ?? "");
          setGoogleUrl(h.google_url ?? "");
          setBookingUrl(h.booking_url ?? "");
          setTripUrl(h.trip_url ?? "");
          setExpediaUrl(h.expedia_url ?? "");
          setYelpUrl(h.yelp_url ?? "");
        }
        // Always fill address/contact details
        setAddress(h.address ?? "");
        setCity(h.city ?? "");
        setCountry(h.country ?? "");
        setPostalCode(h.postal_code ?? "");
        setPhone(h.phone ?? "");
        setWebsite(h.website ?? "");

        setAutoFillMsg("✓ Hotel details auto-filled — review and save");
        window.setTimeout(() => setAutoFillMsg(null), 3000);
      } else {
        setSearchError(data.error);
      }
    } catch {
      setSearchError("Search failed. Please try again.");
    } finally {
      window.clearInterval(stepTimer);
      setSearching(false);
    }
  }

  function applyAllUrls() {
    if (!searchResult) return;
    const r = searchResult;
    // Use editedUrls if the user has manually edited a field in the results panel,
    // otherwise fall back to what the API returned.
    const eu = editedUrls;

    if (!isLocked) {
      if (r.name) setHotelName(r.name);
      setTripadvisorUrl(eu.tripadvisor || r.tripadvisor_url || "");
      setGoogleUrl(eu.google || r.google_url || "");
      setBookingUrl(eu.booking || r.booking_url || "");
      setTripUrl(eu.trip || r.trip_url || "");
      setExpediaUrl(eu.expedia || r.expedia_url || "");
      setYelpUrl(eu.yelp || r.yelp_url || "");
    }

    setAddress(r.address ?? "");
    setCity(r.city ?? "");
    setCountry(r.country ?? "");
    setPostalCode(r.postal_code ?? "");
    setPhone(r.phone ?? "");
    setWebsite(r.website ?? "");

    setAutoFillMsg("✓ Hotel details auto-filled — review and save");
    window.setTimeout(() => setAutoFillMsg(null), 3000);
  }

  function onSaveNotifications(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingNotifications(true);
    window.setTimeout(() => {
      setSavingNotifications(false);
      showToast("success", "✓ Settings saved");
    }, 200);
  }

  const initialsDisplay = computeInitials(fullName || profile?.full_name, userEmail);
  const subStatus = (profile?.subscription_status ?? "").toLowerCase() || null;

  const billingPlan = useMemo(() => {
    if (subStatus === "trialing" || subStatus === "active" || subStatus === "past_due") {
      return subStatus;
    }
    return "free";
  }, [subStatus]);

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: "account", label: "Account" },
    { id: "hotel", label: "Hotel" },
    { id: "billing", label: "Billing" },
    { id: "notifications", label: "Notifications" },
  ];

  if (loading) {
    return (
      <div className="settings-page">
        <div style={{ marginBottom: "24px", maxWidth: "720px" }}>
          <Skeleton width="220px" height="28px" radius="8px" />
          <Skeleton width="min(100%, 360px)" height="18px" radius="6px" style={{ marginTop: "10px" }} />
        </div>
        <div style={{ ...tabBar, marginBottom: "24px", maxWidth: "720px" }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="88px" height="38px" radius="10px" />
          ))}
        </div>
        <div style={{ ...glass, padding: "28px", maxWidth: "720px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ marginBottom: i === 4 ? 0 : "20px" }}>
              <Skeleton width="120px" height="14px" radius="6px" />
              <Skeleton height="44px" radius="6px" style={{ marginTop: "8px" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-page">
        <div style={{ ...glass, padding: "24px", color: "#f87171", fontSize: "14px" }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div style={{ marginBottom: "8px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#f0f0f0",
            margin: "0 0 4px 0",
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: "14px", color: "#555555", margin: 0 }}>
          Manage your account, property, and preferences
        </p>
      </div>

      <nav style={tabBar} aria-label="Settings sections">
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "8px 0",
                marginRight: 24,
                marginBottom: -1,
                borderRadius: 6,
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                border: "none",
                borderBottom: active ? "2px solid #f0f0f0" : "2px solid transparent",
                background: "transparent",
                color: active ? "#f0f0f0" : "#555555",
                fontFamily: "inherit",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "account" && (
        <div>
          <header style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#f0f0f0", margin: "0 0 6px 0" }}>
              Account
            </h2>
            <p style={{ fontSize: "14px", color: "#888888", margin: 0 }}>
              Manage your personal details and preferences
            </p>
          </header>

          <form onSubmit={onSaveAccount} style={{ ...glass, padding: "28px", marginBottom: "20px" }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#f0f0f0",
                marginBottom: "20px",
              }}
            >
              Personal information
            </h3>

            <div
              className="settings-form-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label htmlFor="acc-full" style={labelStyle}>
                  Full name
                </label>
                <input
                  id="acc-full"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Leonardo Baaijens"
                  style={glassInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3a3a3a";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#2a2a2a";
                  }}
                />
              </div>
              <div>
                <label htmlFor="acc-display" style={labelStyle}>
                  Display name for responses
                </label>
                <input
                  id="acc-display"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Leo"
                  style={glassInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3a3a3a";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#2a2a2a";
                  }}
                />
                <p style={{ fontSize: "12px", color: "#555555", margin: "6px 0 0 0", lineHeight: 1.5 }}>
                  This name appears in AI-generated review responses. Example: &apos;Kind regards, Leo&apos;
                </p>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <label htmlFor="acc-email" style={{ ...labelStyle, marginBottom: 0 }}>
                  Email address
                </label>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "100px",
                    background: "#111111",
                    color: "#555555",
                    border: "1px solid #1e1e1e",
                  }}
                >
                  Cannot be changed here
                </span>
              </div>
              <input
                id="acc-email"
                type="email"
                value={userEmail ?? ""}
                disabled
                readOnly
                style={{
                  ...glassInput,
                  opacity: 0.85,
                  cursor: "not-allowed",
                  background: "#111111",
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label htmlFor="acc-sig" style={labelStyle}>
                Default response signature
              </label>
              <input
                id="acc-sig"
                type="text"
                value={responseSignature}
                onChange={(e) => setResponseSignature(e.target.value)}
                placeholder="The Management Team at Hotel Neo Malioboro"
                style={glassInput}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3a3a3a";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#2a2a2a";
                }}
              />
              <p style={{ fontSize: "12px", color: "#555555", margin: "6px 0 0 0", lineHeight: 1.5 }}>
                This signature appears at the end of every AI-generated response
              </p>
              <div style={{ marginTop: "8px" }}>
                <div style={{ fontSize: "12px", color: "#888888", marginBottom: "6px" }}>Preview</div>
                <div
                  style={{
                    ...glass,
                    padding: "10px 14px",
                    fontSize: "13px",
                    color: "#888888",
                    fontStyle: "italic",
                    borderRadius: "10px",
                  }}
                >
                  Kind regards, {responseSignature.trim() || "The Management Team"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "24px",
                paddingTop: "8px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#1e1e1e",
                  border: "1px solid #2a2a2a",
                  color: "#4ade80",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                {initialsDisplay.slice(0, 2)}
              </div>
              <p style={{ fontSize: "13px", color: "#555555", margin: 0 }}>
                Your initials appear in the sidebar
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={savingAccount}
                style={{
                  ...primaryBtn,
                  opacity: savingAccount ? 0.65 : 1,
                  cursor: savingAccount ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!savingAccount) e.currentTarget.style.background = "#e0e0e0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f0f0f0";
                }}
              >
                {savingAccount ? "Saving…" : "Save account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "hotel" && (
        <div>
          <header style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#f0f0f0", margin: "0 0 6px 0" }}>
              Hotel
            </h2>
            <p style={{ fontSize: "14px", color: "#888888", margin: 0 }}>
              Property details, location, and review platform links
            </p>
          </header>

          {/* ── Lock banner ─────────────────────────────────────── */}
          {isLocked && (
            <div
              style={{
                background: "#1a1200",
                border: "1px solid #2a2000",
                borderRadius: 8,
                padding: "14px 18px",
                marginBottom: 16,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🔒</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>
                  Hotel locked for editing
                </div>
                <div style={{ fontSize: 12, color: "#555555", marginTop: 2 }}>
                  You can edit your hotel details again in {daysRemaining} day
                  {daysRemaining !== 1 ? "s" : ""}
                </div>
                <div style={{ fontSize: 11, color: "#444444", marginTop: 4 }}>
                  Locked until: {lockedUntilFormatted}
                </div>
                <div style={{ fontSize: 12, color: "#555555", marginTop: 8 }}>
                  Need to change your hotel?{" "}
                  <a
                    href="mailto:support@guestpulse.app"
                    style={{ color: "#888888", textDecoration: "underline" }}
                  >
                    Contact support →
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ── Hotel auto-search ───────────────────────────────── */}
          <div
            style={{
              background: "#141414",
              border: "1px solid #1e1e1e",
              borderRadius: 8,
              padding: "20px 24px",
              marginBottom: 20,
              opacity: isLocked ? 0.5 : 1,
              pointerEvents: isLocked ? "none" : undefined,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#555555",
                marginBottom: 12,
              }}
            >
              Find your hotel
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Hotel name e.g. The Grand Hotel"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void runHotelSearch(); }}
                style={{
                  flex: 2,
                  minWidth: 160,
                  background: "#111111",
                  border: "1px solid #2a2a2a",
                  borderRadius: 6,
                  padding: "10px 14px",
                  color: "#f0f0f0",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <input
                type="text"
                placeholder="City (optional)"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void runHotelSearch(); }}
                style={{
                  flex: 1,
                  minWidth: 100,
                  background: "#111111",
                  border: "1px solid #2a2a2a",
                  borderRadius: 6,
                  padding: "10px 14px",
                  color: "#f0f0f0",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                disabled={searching || !searchName.trim()}
                onClick={() => void runHotelSearch()}
                style={{
                  background: "#f0f0f0",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 20px",
                  color: "#0d0d0d",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: searching || !searchName.trim() ? "not-allowed" : "pointer",
                  opacity: searching || !searchName.trim() ? 0.55 : 1,
                  flexShrink: 0,
                  fontFamily: "inherit",
                }}
              >
                {searching ? "Searching…" : "Find hotel"}
              </button>
            </div>

            {/* Loading steps */}
            {searching && (
              <div
                style={{
                  marginTop: 12,
                  background: "#111111",
                  borderRadius: 6,
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {[
                  "⟳ Searching Google Maps…",
                  "⟳ Finding platform profiles…",
                  "⟳ Verifying URLs…",
                ].map((msg, i) =>
                  searchStep >= i ? (
                    <div
                      key={i}
                      style={{
                        fontSize: 13,
                        color: "#888888",
                        animation: "step-fade-in 0.4s ease",
                      }}
                    >
                      {msg}
                    </div>
                  ) : null,
                )}
              </div>
            )}

            {/* Error */}
            {searchError && !searching && (
              <div style={{ marginTop: 12, fontSize: 13, color: "#f87171" }}>{searchError}</div>
            )}

            {/* Results */}
            {searchResult && !searching && (
              <div
                style={{
                  marginTop: 12,
                  background: "#0a1a0a",
                  border: "1px solid #1a3a1a",
                  borderRadius: 8,
                  padding: "16px 20px",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f0f0", marginBottom: 4 }}>
                  {searchResult.name}
                </div>
                {searchResult.address && (
                  <div style={{ fontSize: 12, color: "#555555", marginBottom: 4 }}>
                    {searchResult.address}
                  </div>
                )}
                {searchResult.avg_rating && (
                  <div style={{ fontSize: 12, color: "#888888", marginBottom: 12 }}>
                    ⭐ {searchResult.avg_rating.toFixed(1)}
                    {searchResult.total_reviews
                      ? ` (${searchResult.total_reviews.toLocaleString()} reviews)`
                      : ""}
                  </div>
                )}

                {(
                  [
                    { key: "tripadvisor", label: "TripAdvisor", badge: "TA", color: "#4ade80" },
                    { key: "google", label: "Google", badge: "GO", color: "#60a5fa" },
                    { key: "booking", label: "Booking.com", badge: "BK", color: "#a78bfa" },
                    { key: "trip", label: "Trip.com", badge: "TC", color: "#60a5fa" },
                    { key: "expedia", label: "Expedia", badge: "EX", color: "#a78bfa" },
                    { key: "yelp", label: "Yelp", badge: "YP", color: "#f87171" },
                  ] as const
                ).map(({ key, label, badge, color }) => {
                  const urlKey = key === "google" ? "google_url" : key === "tripadvisor" ? "tripadvisor_url" : key === "booking" ? "booking_url" : key === "trip" ? "trip_url" : key === "expedia" ? "expedia_url" : "yelp_url";
                  const foundUrl = searchResult[urlKey as keyof HotelSearchResult] as string | null;
                  const conf = searchResult.url_confidence?.[key] as
                    | "verified"
                    | "search_page"
                    | "not_found"
                    | undefined;
                  const isEditing = editingUrls[key];
                  const currentVal = editedUrls[key] ?? foundUrl ?? "";

                  const confStyle =
                    conf === "verified"
                      ? { bg: "#052e16", color: "#4ade80", label: "✓ Verified", tooltip: undefined }
                      : conf === "search_page"
                        ? {
                            bg: "#1a1200",
                            color: "#fbbf24",
                            label: "⚠ Search page — verify manually",
                            tooltip:
                              "This links to a search page. Find your hotel and update the URL manually.",
                          }
                        : { bg: "#1a1a1a", color: "#555555", label: "Verify manually", tooltip: undefined };

                  return (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: "1px solid #1a2a1a",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 32,
                          height: 22,
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#0d0d0d",
                          background: color,
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {badge}
                      </span>

                      {foundUrl || currentVal ? (
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {isEditing ? (
                            <input
                              type="url"
                              value={currentVal}
                              onChange={(e) =>
                                setEditedUrls((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              style={{
                                width: "100%",
                                background: "#111111",
                                border: "1px solid #2a2a2a",
                                borderRadius: 4,
                                padding: "6px 10px",
                                color: "#f0f0f0",
                                fontSize: 12,
                                outline: "none",
                                boxSizing: "border-box",
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: 12, color: "#888888", wordBreak: "break-all" }}>
                              {currentVal.length > 48
                                ? `${currentVal.slice(0, 48)}…`
                                : currentVal}
                            </span>
                          )}
                          {conf && conf !== "not_found" && (
                            <span
                              title={confStyle.tooltip}
                              style={{
                                display: "inline-block",
                                marginLeft: 6,
                                padding: "1px 6px",
                                borderRadius: 3,
                                fontSize: 10,
                                fontWeight: 600,
                                background: confStyle.bg,
                                color: confStyle.color,
                                cursor: confStyle.tooltip ? "help" : undefined,
                              }}
                            >
                              {confStyle.label}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 12, color: "#444444" }}>
                            Not found — add manually
                          </span>
                          <input
                            type="url"
                            placeholder={`https://...`}
                            value={editedUrls[key] ?? ""}
                            onChange={(e) =>
                              setEditedUrls((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            style={{
                              display: "block",
                              width: "100%",
                              marginTop: 4,
                              background: "#111111",
                              border: "1px solid #2a2a2a",
                              borderRadius: 4,
                              padding: "6px 10px",
                              color: "#f0f0f0",
                              fontSize: 12,
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {(foundUrl || currentVal) && !isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              const val = currentVal || foundUrl || "";
                              if (key === "tripadvisor") setTripadvisorUrl(val);
                              else if (key === "google") setGoogleUrl(val);
                              else if (key === "booking") setBookingUrl(val);
                              else if (key === "trip") setTripUrl(val);
                              else if (key === "expedia") setExpediaUrl(val);
                              else if (key === "yelp") setYelpUrl(val);
                              showToast("success", `✓ ${label} URL applied`);
                            }}
                            style={{
                              background: "#f0f0f0",
                              border: "none",
                              borderRadius: 4,
                              padding: "4px 10px",
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#0d0d0d",
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            ✓ Use
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setEditingUrls((prev) => ({ ...prev, [key]: !prev[key] }))
                          }
                          style={{
                            background: "transparent",
                            border: "1px solid #2a2a2a",
                            borderRadius: 4,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 500,
                            color: "#888888",
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {isEditing ? "Done" : "Edit"}
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={applyAllUrls}
                  style={{
                    marginTop: 16,
                    width: "100%",
                    background: "#f0f0f0",
                    border: "none",
                    borderRadius: 6,
                    padding: "10px 0",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0d0d0d",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Apply all URLs →
                </button>
              </div>
            )}
          </div>

          {autoFillMsg && (
            <div
              style={{
                background: "#0a1a0a",
                border: "1px solid #1a3a1a",
                borderRadius: 6,
                padding: "10px 14px",
                fontSize: 12,
                color: "#4ade80",
                marginBottom: 16,
              }}
            >
              {autoFillMsg}
            </div>
          )}

          <form onSubmit={onSaveHotel}>
            <div style={{ ...glass, padding: "28px", marginBottom: "20px" }}>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#f0f0f0",
                  marginBottom: "20px",
                }}
              >
                Property details
              </h3>
              <div
                className="settings-form-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "16px",
                }}
              >
                <div>
                  <label htmlFor="h-name" style={labelStyle}>
                    Hotel name
                  </label>
                  <input
                    id="h-name"
                    type="text"
                    required
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                    placeholder="My Boutique Hotel"
                    disabled={isLocked}
                    title={isLocked ? `Locked for ${daysRemaining} more days — contact support to unlock` : undefined}
                    style={{ ...glassInput, opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : undefined }}
                    onFocus={(e) => {
                      if (!isLocked) e.target.style.borderColor = "#3a3a3a";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2a2a2a";
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="h-phone" style={labelStyle}>
                    Phone number
                  </label>
                  <input
                    id="h-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={glassInput}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#3a3a3a";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2a2a2a";
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="h-web" style={labelStyle}>
                    Website URL
                  </label>
                  <input
                    id="h-web"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                    style={glassInput}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#3a3a3a";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2a2a2a";
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="h-rooms" style={labelStyle}>
                    Number of rooms
                  </label>
                  <input
                    id="h-rooms"
                    type="number"
                    min={0}
                    value={roomCount}
                    onChange={(e) => setRoomCount(e.target.value)}
                    placeholder="24"
                    style={glassInput}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#3a3a3a";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2a2a2a";
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ ...glass, padding: "28px", marginBottom: "12px" }}>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#f0f0f0",
                  marginBottom: "20px",
                }}
              >
                Location
              </h3>
              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="h-addr" style={labelStyle}>
                  Street address
                </label>
                <input
                  id="h-addr"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jalan Pasar Kembang No. 21"
                  style={glassInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3a3a3a";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#2a2a2a";
                  }}
                />
              </div>
              <div
                className="settings-form-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                }}
              >
                <div>
                  <label htmlFor="h-city" style={labelStyle}>
                    City
                  </label>
                  <input
                    id="h-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Yogyakarta"
                    style={glassInput}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#3a3a3a";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2a2a2a";
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="h-country" style={labelStyle}>
                    Country
                  </label>
                  <input
                    id="h-country"
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Indonesia"
                    style={glassInput}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#3a3a3a";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2a2a2a";
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="h-postal" style={labelStyle}>
                    Postal code
                  </label>
                  <input
                    id="h-postal"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="55271"
                    style={glassInput}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#3a3a3a";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2a2a2a";
                    }}
                  />
                </div>
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "#555555",
                  fontStyle: "italic",
                  margin: "16px 0 0 0",
                  lineHeight: 1.5,
                }}
              >
                Your hotel location is used for competitor discovery and local search features — coming soon.
              </p>
            </div>

            <div style={{ ...glass, padding: "28px", marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#f0f0f0",
                  margin: "0 0 4px 0",
                }}
              >
                Review platforms
              </h3>
              <p style={{ fontSize: "13px", color: "#888888", margin: "0 0 20px 0", lineHeight: 1.5 }}>
                Add your hotel&apos;s URLs on each platform to enable automatic review syncing
              </p>

              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="h-ta" style={labelStyle}>
                  TripAdvisor URL
                </label>
                <div style={{ display: "flex", alignItems: "stretch", gap: "10px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "40px",
                      borderRadius: "6px",
                      background: "rgba(74,222,128,0.1)",
                      color: "#4ade80",
                      border: "1px solid rgba(74,222,128,0.25)",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    TA
                  </span>
                  <input
                    id="h-ta"
                    type="url"
                    value={tripadvisorUrl}
                    onChange={(e) => setTripadvisorUrl(e.target.value)}
                    placeholder="https://tripadvisor.com/hotel/..."
                    disabled={isLocked}
                    title={isLocked ? `Locked for ${daysRemaining} more days — contact support to unlock` : undefined}
                    style={{ ...glassInput, flex: 1, opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : undefined }}
                    onFocus={(e) => { if (!isLocked) e.target.style.borderColor = "#3a3a3a"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#2a2a2a"; }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="h-g" style={labelStyle}>
                  Google Maps URL
                </label>
                <div style={{ display: "flex", alignItems: "stretch", gap: "10px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "40px",
                      borderRadius: "6px",
                      background: "rgba(59, 130, 246, 0.12)",
                      color: "#3b82f6",
                      border: "1px solid rgba(59, 130, 246, 0.35)",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    G
                  </span>
                  <input
                    id="h-g"
                    type="url"
                    value={googleUrl}
                    onChange={(e) => setGoogleUrl(e.target.value)}
                    placeholder="https://www.google.com/maps/place/..."
                    disabled={isLocked}
                    title={isLocked ? `Locked for ${daysRemaining} more days — contact support to unlock` : undefined}
                    style={{ ...glassInput, flex: 1, opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : undefined }}
                    onFocus={(e) => { if (!isLocked) e.target.style.borderColor = "#3a3a3a"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#2a2a2a"; }}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="h-b" style={labelStyle}>
                  Booking.com URL
                </label>
                <div style={{ display: "flex", alignItems: "stretch", gap: "10px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "40px",
                      borderRadius: "6px",
                      background: "rgba(167,139,250,0.1)",
                      color: "#a78bfa",
                      border: "1px solid rgba(167,139,250,0.25)",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    BK
                  </span>
                  <input
                    id="h-b"
                    type="url"
                    value={bookingUrl}
                    onChange={(e) => setBookingUrl(e.target.value)}
                    placeholder="https://booking.com/hotel/..."
                    disabled={isLocked}
                    title={isLocked ? `Locked for ${daysRemaining} more days — contact support to unlock` : undefined}
                    style={{ ...glassInput, flex: 1, opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : undefined }}
                    onFocus={(e) => { if (!isLocked) e.target.style.borderColor = "#3a3a3a"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#2a2a2a"; }}
                  />
                </div>
              </div>
              <div style={{ marginTop: "16px" }}>
                <label htmlFor="h-trip" style={labelStyle}>
                  Trip.com URL
                </label>
                <div style={{ display: "flex", alignItems: "stretch", gap: "10px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "40px",
                      borderRadius: "6px",
                      background: "#1e1b4b",
                      color: "#60a5fa",
                      border: "1px solid rgba(96,165,250,0.25)",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    TC
                  </span>
                  <input
                    id="h-trip"
                    type="url"
                    value={tripUrl}
                    onChange={(e) => setTripUrl(e.target.value)}
                    placeholder="https://trip.com/hotels/..."
                    disabled={isLocked}
                    title={isLocked ? `Locked for ${daysRemaining} more days — contact support to unlock` : undefined}
                    style={{ ...glassInput, flex: 1, opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : undefined }}
                    onFocus={(e) => { if (!isLocked) e.target.style.borderColor = "#3a3a3a"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#2a2a2a"; }}
                  />
                </div>
              </div>
              <div style={{ marginTop: "16px" }}>
                <label htmlFor="h-expedia" style={labelStyle}>
                  Expedia URL
                </label>
                <div style={{ display: "flex", alignItems: "stretch", gap: "10px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "40px",
                      borderRadius: "6px",
                      background: "#1a0a2e",
                      color: "#a78bfa",
                      border: "1px solid rgba(167,139,250,0.25)",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    EX
                  </span>
                  <input
                    id="h-expedia"
                    type="url"
                    value={expediaUrl}
                    onChange={(e) => setExpediaUrl(e.target.value)}
                    placeholder="https://expedia.com/hotels/..."
                    disabled={isLocked}
                    title={isLocked ? `Locked for ${daysRemaining} more days — contact support to unlock` : undefined}
                    style={{ ...glassInput, flex: 1, opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : undefined }}
                    onFocus={(e) => { if (!isLocked) e.target.style.borderColor = "#3a3a3a"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#2a2a2a"; }}
                  />
                </div>
              </div>
              <div style={{ marginTop: "16px" }}>
                <label htmlFor="h-yelp" style={labelStyle}>
                  Yelp URL
                </label>
                <div style={{ display: "flex", alignItems: "stretch", gap: "10px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "40px",
                      borderRadius: "6px",
                      background: "#2d0a0a",
                      color: "#f87171",
                      border: "1px solid rgba(248,113,113,0.25)",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    YP
                  </span>
                  <input
                    id="h-yelp"
                    type="url"
                    value={yelpUrl}
                    onChange={(e) => setYelpUrl(e.target.value)}
                    placeholder="https://yelp.com/biz/..."
                    disabled={isLocked}
                    title={isLocked ? `Locked for ${daysRemaining} more days — contact support to unlock` : undefined}
                    style={{ ...glassInput, flex: 1, opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : undefined }}
                    onFocus={(e) => { if (!isLocked) e.target.style.borderColor = "#3a3a3a"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#2a2a2a"; }}
                  />
                </div>
              </div>
            </div>

            {/* Active platforms */}
            <div style={{ ...glass, padding: "28px", marginBottom: "24px", marginTop: "20px" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#555555",
                  marginBottom: 4,
                }}
              >
                Active platforms
              </div>
              <p style={{ fontSize: 12, color: "#444444", margin: "0 0 16px 0" }}>
                Choose which platforms to sync reviews from
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 10,
                }}
              >
                {(
                  [
                    { key: "tripadvisor" as const, label: "TripAdvisor", badge: "TA", color: "#4ade80", hasUrl: !!tripadvisorUrl.trim() },
                    { key: "google" as const, label: "Google", badge: "GO", color: "#60a5fa", hasUrl: !!googleUrl.trim() },
                    { key: "booking" as const, label: "Booking.com", badge: "BK", color: "#a78bfa", hasUrl: !!bookingUrl.trim() },
                    { key: "trip" as const, label: "Trip.com", badge: "TC", color: "#60a5fa", hasUrl: !!tripUrl.trim() },
                    { key: "expedia" as const, label: "Expedia", badge: "EX", color: "#a78bfa", hasUrl: !!expediaUrl.trim() },
                    { key: "yelp" as const, label: "Yelp", badge: "YP", color: "#f87171", hasUrl: !!yelpUrl.trim() },
                  ] as const
                ).map(({ key, label, badge, color, hasUrl }) => {
                  const active = activePlatforms[key];
                  return (
                    <div
                      key={key}
                      title={!hasUrl ? "Add a URL above to enable this platform" : undefined}
                      onClick={() => {
                        if (!hasUrl) return;
                        setActivePlatforms((prev) => ({ ...prev, [key]: !prev[key] }));
                      }}
                      style={{
                        background: "#111111",
                        border: `1px solid ${active && hasUrl ? "#4ade80" : "#2a2a2a"}`,
                        borderRadius: 6,
                        padding: "10px 14px",
                        cursor: hasUrl ? "pointer" : "not-allowed",
                        opacity: hasUrl ? 1 : 0.4,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        userSelect: "none",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 28,
                          height: 18,
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#0d0d0d",
                          background: color,
                          flexShrink: 0,
                        }}
                      >
                        {badge}
                      </span>
                      <span style={{ fontSize: 13, color: "#f0f0f0", flex: 1, minWidth: 0 }}>
                        {label}
                      </span>
                      {active && hasUrl ? (
                        <span style={{ color: "#4ade80", fontSize: 13, flexShrink: 0 }}>✓</span>
                      ) : (
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            border: "1px solid #2a2a2a",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={savingHotel}
                style={{
                  ...primaryBtn,
                  opacity: savingHotel ? 0.65 : 1,
                  cursor: savingHotel ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!savingHotel) e.currentTarget.style.background = "#e0e0e0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f0f0f0";
                }}
              >
                {savingHotel ? "Saving…" : "Save hotel settings"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "billing" && (
        <div>
          <header style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#f0f0f0", margin: "0 0 6px 0" }}>
              Billing
            </h2>
            <p style={{ fontSize: "14px", color: "#888888", margin: 0 }}>
              Subscription and invoices
            </p>
          </header>

          <div style={{ ...glass, padding: "28px", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0f0", margin: "0 0 16px 0" }}>
              Current plan
            </h3>

            {/* FREE */}
            {billingPlan === "free" && (
              <div style={{ padding: "20px", borderRadius: "8px", background: "#111111", border: "1px solid #1e1e1e" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#555555", marginBottom: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Free Plan
                </div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0f0", margin: "0 0 8px 0" }}>
                  You&apos;re on the free plan
                </p>
                <p style={{ fontSize: "13px", color: "#888888", margin: "0 0 16px 0" }}>
                  Upgrade to unlock AI features, competitor benchmarking, and more
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/pricing")}
                  style={{ ...primaryBtn, display: "inline-flex" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#e0e0e0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
                >
                  View pricing plans →
                </button>
                <p style={{ fontSize: "12px", color: "#555555", margin: "10px 0 0 0" }}>
                  7-day free trial · No credit card required
                </p>
              </div>
            )}

            {/* TRIALING */}
            {billingPlan === "trialing" && (
              <div style={{ padding: "20px", borderRadius: "8px", background: "#111111", border: "1px solid #2a2000" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#fbbf24", marginBottom: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Trial active
                </div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0f0", margin: "0 0 4px 0" }}>
                  {profile?.subscription_plan
                    ? `${profile.subscription_plan.charAt(0).toUpperCase()}${profile.subscription_plan.slice(1)} — Trial`
                    : "Free trial"}
                </p>
                <p style={{ fontSize: "13px", color: "#fbbf24", margin: "0 0 4px 0" }}>Trial active</p>
                <p style={{ fontSize: "13px", color: "#888888", margin: "0 0 16px 0" }}>
                  Your trial is active. Upgrade before it ends to keep access.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/pricing")}
                  style={{ ...primaryBtn }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#e0e0e0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
                >
                  Manage subscription
                </button>
              </div>
            )}

            {/* ACTIVE */}
            {billingPlan === "active" && (() => {
              const plan = profile?.subscription_plan ?? "professional";
              const isEssential = plan === "essential";
              const isBusiness = plan === "business";
              const borderColor = isEssential ? "#2a2a2a" : isBusiness ? "#1e3a5f" : "#1a3a1a";
              const accentColor = isEssential ? "#888888" : isBusiness ? "#60a5fa" : "#4ade80";
              const planLabel = isEssential ? "Essential" : isBusiness ? "Multi-property" : "Professional";
              return (
                <div style={{ padding: "20px", borderRadius: "8px", background: "#111111", border: `1px solid ${borderColor}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: accentColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {planLabel}
                    </div>
                    <span style={{ fontSize: "12px", color: "#4ade80" }}>Active ✓</span>
                  </div>
                  <p style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0f0", margin: "0 0 4px 0" }}>
                    You&apos;re on the {planLabel} plan
                  </p>
                  <p style={{ fontSize: "13px", color: "#888888", margin: "0 0 16px 0" }}>
                    Next billing: managed via Stripe
                  </p>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => showToast("error", "Open Stripe customer portal to manage billing.")}
                      style={{ ...primaryBtn }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#e0e0e0"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
                    >
                      Manage subscription
                    </button>
                    <Link href="/dashboard/pricing" style={{ fontSize: "13px", color: "#888888", textDecoration: "underline" }}>
                      Upgrade plan
                    </Link>
                  </div>
                </div>
              );
            })()}

            {/* PAST_DUE */}
            {billingPlan === "past_due" && (
              <div style={{ padding: "20px", borderRadius: "8px", background: "#111111", border: "1px solid #3a1a1a" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#f87171", marginBottom: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Payment failed
                </div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0f0", margin: "0 0 8px 0" }}>
                  Payment failed — update billing to restore access
                </p>
                <button
                  type="button"
                  onClick={() => showToast("error", "Connect Stripe to update billing.")}
                  style={{ ...primaryBtn }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#e0e0e0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
                >
                  Update billing
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === "notifications" && (
        <div>
          <form onSubmit={onSaveNotifications}>
            <div style={{ ...glass, padding: "28px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0f0", margin: "0 0 4px 0" }}>
                Email notifications
              </h2>
              <p style={{ fontSize: "14px", color: "#888888", margin: "0 0 20px 0" }}>
                Choose what emails you receive from GuestPulse
              </p>

              {(
                [
                  {
                    key: "newReviews" as const,
                    title: "New review alerts",
                    desc: "Get notified when a new review is posted",
                  },
                  {
                    key: "urgentAlerts" as const,
                    title: "Urgent review alerts",
                    desc: "Instant alert when a 1 or 2 star review comes in",
                  },
                  {
                    key: "weeklyDigest" as const,
                    title: "Weekly digest",
                    desc: "Monday morning summary of your reviews and ratings",
                  },
                  {
                    key: "monthlyReport" as const,
                    title: "Monthly report",
                    desc: "Monthly overview of your reputation performance",
                  },
                  {
                    key: "syncReminders" as const,
                    title: "Platform sync reminders",
                    desc: "Remind me if no sync has happened in 7 days",
                  },
                ] as const
              ).map((row, i) => (
                <div
                  key={row.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px 0",
                    borderBottom: i < 4 ? "1px solid #1e1e1e" : "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#f0f0f0" }}>{row.title}</div>
                    <div style={{ fontSize: "13px", color: "#888888", marginTop: "4px" }}>{row.desc}</div>
                  </div>
                  <ToggleSwitch
                    checked={notifications[row.key]}
                    onChange={(next) => setNotifications((prev) => ({ ...prev, [row.key]: next }))}
                  />
                </div>
              ))}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
                <button
                  type="submit"
                  disabled={savingNotifications}
                  style={{
                    ...primaryBtn,
                    opacity: savingNotifications ? 0.65 : 1,
                    cursor: savingNotifications ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!savingNotifications) e.currentTarget.style.background = "#e0e0e0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f0f0f0";
                  }}
                >
                  {savingNotifications ? "Saving…" : "Save preferences"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {toast ? (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1000,
            ...glass,
            padding: "14px 20px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            maxWidth: "360px",
            background:
              toast.type === "success"
                ? "#052e16"
                : "#2d0a0a",
            border:
              toast.type === "success"
                ? "1px solid #14532d"
                : "1px solid #7f1d1d",
            color: toast.type === "success" ? "#f0f0f0" : "#fca5a5",
            animation: "settings-toast-in 0.3s ease forwards",
          }}
        >
          <span>{toast.type === "success" ? "✓" : "!"}</span>
          <span style={{ fontSize: "14px", fontWeight: 500 }}>{toast.message}</span>
        </div>
      ) : null}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes settings-toast-in {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes step-fade-in {
              from { opacity: 0; transform: translateX(-6px); }
              to { opacity: 1; transform: translateX(0); }
            }
            @media (max-width: 768px) {
              .settings-page .settings-form-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
