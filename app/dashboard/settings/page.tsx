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
};

type HotelRow = {
  id: string;
  user_id: string;
  name: string | null;
  tripadvisor_url: string | null;
  google_url: string | null;
  booking_url: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
  response_signature: string | null;
  room_count: number | null;
};

const glass: CSSProperties = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--card-radius)",
  boxShadow: "var(--glass-shadow), var(--glass-inner)",
};

const glassInput: CSSProperties = {
  width: "100%",
  background: "var(--glass-input-bg)",
  border: "1px solid var(--glass-input-border)",
  borderRadius: "var(--input-radius)",
  padding: "12px 16px",
  color: "var(--input-text)",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtn: CSSProperties = {
  background: "var(--btn-primary-bg)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid var(--btn-primary-border)",
  borderRadius: "var(--btn-radius)",
  padding: "12px 24px",
  color: "var(--on-primary)",
  fontWeight: 500,
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "var(--text-secondary)",
  marginBottom: "6px",
};

const tabBar: CSSProperties = {
  display: "flex",
  gap: "4px",
  background: "var(--glass-bg)",
  border: "1px solid var(--glass-border)",
  borderRadius: "14px",
  padding: "4px",
  marginBottom: "32px",
  flexWrap: "wrap",
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
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
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
        background: checked ? "var(--accent)" : "var(--glass-border)",
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
            setResponseSignature(h.response_signature?.trim() || "The Management Team");
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
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("You must be signed in.");

      if (!hotelName.trim()) throw new Error("Hotel name is required.");

      const roomsParsed = roomCount.trim() === "" ? null : parseInt(roomCount, 10);
      const room_count =
        roomsParsed !== null && !Number.isNaN(roomsParsed) ? roomsParsed : null;

      const payload = {
        name: hotelName.trim(),
        phone: phone.trim() || null,
        website: website.trim() || null,
        room_count,
        address: address.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        postal_code: postalCode.trim() || null,
        tripadvisor_url: tripadvisorUrl.trim() || null,
        google_url: googleUrl.trim() || null,
        booking_url: bookingUrl.trim() || null,
        response_signature: responseSignature.trim() || "The Management Team",
      };

      if (hotelId) {
        const { error: updateError } = await supabase.from("hotels").update(payload).eq("id", hotelId);
        if (updateError) throw updateError;
        setHotel((prev) => (prev ? { ...prev, ...payload, id: hotelId, user_id: user.id } : prev));
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("hotels")
          .insert({ ...payload, user_id: user.id })
          .select("*")
          .single();
        if (insertError) throw insertError;
        const insertedHotel = inserted as HotelRow;
        setHotelId(insertedHotel.id);
        setHotel(insertedHotel);
      }

      showToast("success", "✓ Settings saved");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save hotel.");
    } finally {
      setSavingHotel(false);
    }
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
              <Skeleton height="44px" radius="var(--input-radius)" style={{ marginTop: "8px" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-page">
        <div style={{ ...glass, padding: "24px", color: "var(--error)", fontSize: "14px" }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div style={{ marginBottom: "8px" }}>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "var(--text-primary)",
            margin: "0 0 4px 0",
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>
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
                padding: "10px 20px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                border: active ? "1px solid var(--accent-border)" : "1px solid transparent",
                transition: "all 0.2s ease",
                background: active ? "var(--accent-bg)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "var(--glass-hover-bg)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
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
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
              Account
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
              Manage your personal details and preferences
            </p>
          </header>

          <form onSubmit={onSaveAccount} style={{ ...glass, padding: "28px", marginBottom: "20px" }}>
            <h3
              style={{
                fontSize: "17px",
                fontWeight: 600,
                color: "var(--text-primary)",
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
                    e.target.style.borderColor = "var(--focus-ring)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--glass-input-border)";
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
                    e.target.style.borderColor = "var(--focus-ring)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--glass-input-border)";
                  }}
                />
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "6px 0 0 0", lineHeight: 1.5 }}>
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
                    background: "var(--glass-muted)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--glass-border)",
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
                  background: "var(--glass-muted)",
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
                  e.target.style.borderColor = "var(--focus-ring)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--glass-input-border)";
                }}
              />
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "6px 0 0 0" }}>
                Appended to every AI-generated response
              </p>
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
                  background: "var(--accent-bg)",
                  border: "1px solid var(--accent-border)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                {initialsDisplay.slice(0, 2)}
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
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
                  if (!savingAccount) e.currentTarget.style.background = "var(--btn-primary-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--btn-primary-bg)";
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
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
              Hotel
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
              Property details, location, and review platform links
            </p>
          </header>

          <form onSubmit={onSaveHotel}>
            <div style={{ ...glass, padding: "28px", marginBottom: "20px" }}>
              <h3
                style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
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
                    style={glassInput}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--focus-ring)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--glass-input-border)";
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
                      e.target.style.borderColor = "var(--focus-ring)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--glass-input-border)";
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
                      e.target.style.borderColor = "var(--focus-ring)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--glass-input-border)";
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
                      e.target.style.borderColor = "var(--focus-ring)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--glass-input-border)";
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ ...glass, padding: "28px", marginBottom: "12px" }}>
              <h3
                style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
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
                    e.target.style.borderColor = "var(--focus-ring)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--glass-input-border)";
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
                      e.target.style.borderColor = "var(--focus-ring)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--glass-input-border)";
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
                      e.target.style.borderColor = "var(--focus-ring)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--glass-input-border)";
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
                      e.target.style.borderColor = "var(--focus-ring)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--glass-input-border)";
                    }}
                  />
                </div>
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
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
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 4px 0",
                }}
              >
                Review platforms
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 20px 0", lineHeight: 1.5 }}>
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
                      borderRadius: "var(--input-radius)",
                      background: "var(--success-bg)",
                      color: "var(--success)",
                      border: "1px solid var(--success-border)",
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
                    style={{ ...glassInput, flex: 1 }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--focus-ring)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--glass-input-border)";
                    }}
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
                      borderRadius: "var(--input-radius)",
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
                    style={{ ...glassInput, flex: 1 }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--focus-ring)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--glass-input-border)";
                    }}
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
                      borderRadius: "var(--input-radius)",
                      background: "var(--platform-booking-bg)",
                      color: "var(--platform-booking)",
                      border: "1px solid var(--platform-booking-border)",
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
                    style={{ ...glassInput, flex: 1 }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--focus-ring)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--glass-input-border)";
                    }}
                  />
                </div>
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
                  if (!savingHotel) e.currentTarget.style.background = "var(--btn-primary-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--btn-primary-bg)";
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
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
              Billing
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
              Subscription and invoices
            </p>
          </header>

          <div style={{ ...glass, padding: "28px", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px 0" }}>
              Current plan
            </h3>
            {billingPlan === "free" && (
              <div
                style={{
                  padding: "24px",
                  borderRadius: "16px",
                  background: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: "100px",
                    background: "var(--glass-muted)",
                    color: "var(--text-muted)",
                    marginBottom: "12px",
                  }}
                >
                  Free Plan
                </span>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px 0" }}>
                  You&apos;re on the free plan
                </p>
                <ul style={{ margin: "0 0 12px 0", paddingLeft: "20px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  <li>Review inbox & sync</li>
                  <li>Basic sentiment overview</li>
                  <li>Single property</li>
                </ul>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 8px 0" }}>Premium (locked)</p>
                <ul style={{ margin: "0 0 20px 0", paddingLeft: "20px", color: "var(--text-muted)", fontSize: "13px" }}>
                  <li>🔒 Advanced analytics</li>
                  <li>🔒 Competitor benchmarks</li>
                  <li>🔒 Priority support</li>
                </ul>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/pricing")}
                  style={{
                    ...primaryBtn,
                    width: "100%",
                    justifyContent: "center",
                    display: "inline-flex",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-bg)";
                  }}
                >
                  Upgrade to Pro — $99/mo
                </button>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "12px 0 0 0", textAlign: "center" }}>
                  7-day free trial included · No credit card required
                </p>
              </div>
            )}
            {billingPlan === "trialing" && (
              <div
                style={{
                  padding: "24px",
                  borderRadius: "16px",
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: "100px",
                    background: "rgba(245, 158, 11, 0.2)",
                    color: "#d97706",
                    marginBottom: "12px",
                  }}
                >
                  Trial
                </span>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
                  Your free trial is active
                </p>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 16px 0" }}>
                  Trial end date: set in Stripe when connected
                </p>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 16px 0" }}>
                  Upgrade before trial ends to keep access
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/pricing")}
                  style={primaryBtn}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-bg)";
                  }}
                >
                  Upgrade
                </button>
              </div>
            )}
            {billingPlan === "active" && (
              <div
                style={{
                  padding: "24px",
                  borderRadius: "16px",
                  background: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: "100px",
                    background: "rgba(34, 197, 94, 0.15)",
                    color: "var(--success)",
                    marginBottom: "12px",
                  }}
                >
                  Pro ✓
                </span>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
                  You&apos;re on the Pro plan
                </p>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 16px 0" }}>
                  Next billing date: — (Stripe)
                </p>
                <Link
                  href="/dashboard/pricing"
                  style={{
                    ...primaryBtn,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-bg)";
                  }}
                >
                  Manage subscription
                </Link>
              </div>
            )}
            {billingPlan === "past_due" && (
              <div
                style={{
                  padding: "24px",
                  borderRadius: "16px",
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: "100px",
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "var(--error)",
                    marginBottom: "12px",
                  }}
                >
                  Payment failed
                </span>
                <p style={{ fontSize: "15px", color: "var(--text-primary)", margin: "0 0 16px 0" }}>
                  Update payment method to restore access
                </p>
                <button
                  type="button"
                  onClick={() => showToast("error", "Connect Stripe to update billing.")}
                  style={primaryBtn}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-bg)";
                  }}
                >
                  Update billing
                </button>
              </div>
            )}
          </div>

          <div style={{ ...glass, padding: "28px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px 0" }}>
              Payment method
            </h3>
            {billingPlan === "free" ? (
              <>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 20px 0", lineHeight: 1.5 }}>
                  No payment method on file
                </p>
                <Link
                  href="/dashboard/pricing"
                  style={{
                    ...primaryBtn,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-bg)";
                  }}
                >
                  Add payment method
                </Link>
              </>
            ) : (
              <>
                <p style={{ fontSize: "14px", color: "var(--text-primary)", margin: "0 0 6px 0", fontWeight: 500 }}>
                  Payment method on file
                </p>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 6px 0" }}>
                  Card ending in{" "}
                  <span style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.06em" }}>••••</span>
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 20px 0", lineHeight: 1.5 }}>
                  Last 4 digits will display here once Stripe billing is connected.
                </p>
                <Link
                  href="/dashboard/pricing"
                  style={{
                    ...primaryBtn,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-bg)";
                  }}
                >
                  Update payment method
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div>
          <form onSubmit={onSaveNotifications}>
            <div style={{ ...glass, padding: "28px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
                Email notifications
              </h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 20px 0" }}>
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
                    borderBottom: i < 4 ? "1px solid var(--divider)" : "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{row.title}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>{row.desc}</div>
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
                    if (!savingNotifications) e.currentTarget.style.background = "var(--btn-primary-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--btn-primary-bg)";
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
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            maxWidth: "360px",
            boxShadow: "var(--glass-shadow), 0 12px 40px rgba(0,0,0,0.15)",
            background:
              toast.type === "success"
                ? "var(--message-success-bg)"
                : "var(--message-error-bg)",
            border:
              toast.type === "success"
                ? "1px solid var(--message-success-border)"
                : "1px solid var(--message-error-border)",
            color: toast.type === "success" ? "var(--text-primary)" : "var(--text-error-soft)",
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
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
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
