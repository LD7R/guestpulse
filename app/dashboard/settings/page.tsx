// Run in Supabase:
// alter table public.hotels
// add column if not exists locked_until timestamp with time zone,
// add column if not exists lock_started_at timestamp with time zone;
//
// alter table public.hotels
// add column if not exists active_platforms jsonb
//   default '{"tripadvisor":true,"google":true,"booking":true,"trip":false,"expedia":false,"yelp":false}';
//
// alter table public.profiles
// add column if not exists preferred_language text default 'English';

"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";

type ProfileRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_initials: string | null;
  preferred_language: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  stripe_customer_id: string | null;
  notif_new_reviews: boolean | null;
  notif_urgent_alerts: boolean | null;
  notif_weekly_digest: boolean | null;
  notif_monthly_report: boolean | null;
  notif_sync_reminders: boolean | null;
  notif_rating_drops: boolean | null;
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
  last_sync_at: string | null;
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

type ToastState = { type: "success" | "error"; message: string } | null;
type ActiveTab = "account" | "hotel" | "platforms" | "billing" | "notifications";

// ─── Style constants ────────────────────────────────────────────────────────

const card: CSSProperties = { background: "#141414", border: "1px solid #1e1e1e", borderRadius: "8px" };
const inp: CSSProperties = { width: "100%", background: "#111111", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "10px 14px", color: "#f0f0f0", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const primaryBtn: CSSProperties = { background: "#f0f0f0", border: "none", borderRadius: "6px", padding: "7px 16px", color: "#0d0d0d", fontWeight: 600, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" };
const divider: CSSProperties = { height: "1px", background: "#1e1e1e", margin: "24px 0", border: "none" };

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", "Dutch",
  "Russian", "Japanese", "Chinese (Simplified)", "Chinese (Traditional)", "Korean",
  "Arabic", "Indonesian", "Thai", "Vietnamese", "Turkish", "Polish", "Swedish",
];

const PLATFORMS = [
  { key: "tripadvisor" as const, label: "TripAdvisor", badge: "TA", bg: "#052e16", color: "#4ade80" },
  { key: "google" as const, label: "Google", badge: "G", bg: "#172554", color: "#60a5fa" },
  { key: "booking" as const, label: "Booking.com", badge: "BK", bg: "#1e1b4b", color: "#a78bfa" },
  { key: "trip" as const, label: "Trip.com", badge: "TC", bg: "#1e1b4b", color: "#60a5fa" },
  { key: "expedia" as const, label: "Expedia", badge: "EX", bg: "#1a0a2e", color: "#a78bfa" },
  { key: "yelp" as const, label: "Yelp", badge: "YP", bg: "#2d0a0a", color: "#f87171" },
];

// ─── Helper functions ────────────────────────────────────────────────────────

function computeInitials(fullName: string | null | undefined, email: string | null | undefined): string {
  const n = fullName?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  const e = email?.trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return "?";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Skeleton({ width = "100%", height = "20px", radius = "8px", style }: { width?: string; height?: string; radius?: string; style?: CSSProperties }) {
  return <div style={{ width, height, borderRadius: radius, background: "#1a1a1a", border: "1px solid #1e1e1e", animation: "skeleton-pulse 1.5s ease-in-out infinite", ...style }} />;
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      style={{ width: 44, height: 24, borderRadius: 100, border: "none", padding: 0, cursor: "pointer", background: checked ? "#4ade80" : "#2a2a2a", transition: "background 0.2s", position: "relative", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555555", marginBottom: 12 }}>{children}</div>;
}

function SaveRow({ saving, label, disabled }: { saving: boolean; label: string; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
      <button type="submit" disabled={saving || disabled}
        style={{ ...primaryBtn, opacity: saving || disabled ? 0.6 : 1, cursor: saving || disabled ? "not-allowed" : "pointer" }}
        onMouseEnter={e => { if (!saving && !disabled) e.currentTarget.style.background = "#e0e0e0"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#f0f0f0"; }}>
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("account");

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [hotel, setHotel] = useState<HotelRow | null>(null);
  const [hotelId, setHotelId] = useState<string | null>(null);

  // Account fields
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [responseSignature, setResponseSignature] = useState("The Management Team");
  const [preferredLanguage, setPreferredLanguage] = useState("English");

  // Hotel fields
  const [hotelName, setHotelName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [roomCount, setRoomCount] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Platform URLs
  const [tripadvisorUrl, setTripadvisorUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [tripUrl, setTripUrl] = useState("");
  const [expediaUrl, setExpediaUrl] = useState("");
  const [yelpUrl, setYelpUrl] = useState("");

  // Active platforms
  const [activePlatforms, setActivePlatforms] = useState<ActivePlatforms>({
    tripadvisor: true, google: true, booking: true, trip: false, expedia: false, yelp: false,
  });

  // Hotel search
  const [searchName, setSearchName] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(0);
  const [searchResult, setSearchResult] = useState<HotelSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editingUrls, setEditingUrls] = useState<Record<string, boolean>>({});
  const [editedUrls, setEditedUrls] = useState<Record<string, string>>({});
  const [autoFillMsg, setAutoFillMsg] = useState<string | null>(null);

  // Saving states
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingHotel, setSavingHotel] = useState(false);
  const [savingPlatforms, setSavingPlatforms] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState({
    newReviews: true,
    urgentAlerts: true,
    weeklyDigest: true,
    monthlyReport: false,
    syncReminders: true,
    ratingDropAlerts: true,
  });

  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), type === "success" ? 3000 : 5000);
  }, []);

  const isLocked = useMemo(() => !!(hotel?.locked_until && new Date(hotel.locked_until) > new Date()), [hotel]);
  const daysRemaining = useMemo(() => {
    if (!hotel?.locked_until) return 0;
    return Math.max(0, Math.ceil((new Date(hotel.locked_until).getTime() - Date.now()) / 86400000));
  }, [hotel]);
  const lockedUntilFormatted = useMemo(() => {
    if (!hotel?.locked_until) return "";
    return new Date(hotel.locked_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }, [hotel]);

  const billingPlan = useMemo(() => {
    const s = (profile?.subscription_status ?? "").toLowerCase();
    if (s === "trialing" || s === "active" || s === "past_due") return s;
    return "free";
  }, [profile]);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("You must be signed in.");

        setUserId(user.id);
        setUserEmail(user.email ?? null);

        const [profileRes, hotelRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase.from("hotels").select("*").eq("user_id", user.id).maybeSingle(),
        ]);

        if (profileRes.error && profileRes.error.code !== "PGRST116") throw profileRes.error;
        const p = profileRes.data as ProfileRow | null;
        setProfile(p);
        setFullName(p?.full_name ?? "");
        setDisplayName(p?.display_name ?? "");
        setPreferredLanguage(p?.preferred_language ?? "English");
        if (p) {
          setNotifications({
            newReviews: p.notif_new_reviews ?? true,
            urgentAlerts: p.notif_urgent_alerts ?? true,
            weeklyDigest: p.notif_weekly_digest ?? true,
            monthlyReport: p.notif_monthly_report ?? false,
            syncReminders: p.notif_sync_reminders ?? true,
            ratingDropAlerts: p.notif_rating_drops ?? true,
          });
        }

        if (hotelRes.error && hotelRes.error.code !== "PGRST116") throw hotelRes.error;
        const h = hotelRes.data as HotelRow | null;
        setHotel(h);
        setHotelId(h?.id ?? null);
        if (h) {
          setHotelName(h.name ?? "");
          setPhone(h.phone ?? "");
          setWebsite(h.website ?? "");
          setRoomCount(h.room_count != null ? String(h.room_count) : "");
          setAddress(h.address ?? "");
          setCity(h.city ?? "");
          setCountry(h.country ?? "");
          setPostalCode(h.postal_code ?? "");
          setTripadvisorUrl(h.tripadvisor_url ?? "");
          setGoogleUrl(h.google_url ?? "");
          setBookingUrl(h.booking_url ?? "");
          setTripUrl(h.trip_url ?? "");
          setExpediaUrl(h.expedia_url ?? "");
          setYelpUrl(h.yelp_url ?? "");
          setResponseSignature(h.response_signature?.trim() || "The Management Team");
          if (h.active_platforms) {
            try {
              const ap = typeof h.active_platforms === "string" ? JSON.parse(h.active_platforms) as ActivePlatforms : h.active_platforms as ActivePlatforms;
              setActivePlatforms(prev => ({ ...prev, ...ap }));
            } catch { /* keep defaults */ }
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

  // ── Save: Account ──────────────────────────────────────────────────────────

  async function onSaveAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    setSavingAccount(true);
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const initials = computeInitials(fullName, user.email);
      const profileData = { full_name: fullName.trim() || null, display_name: displayName.trim() || null, avatar_initials: initials, preferred_language: preferredLanguage };

      const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("profiles").update(profileData).eq("id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({ id: user.id, ...profileData });
        if (error) throw error;
      }

      setProfile(prev => ({ id: user.id, ...profileData, subscription_status: prev?.subscription_status ?? null, subscription_plan: prev?.subscription_plan ?? null, stripe_customer_id: prev?.stripe_customer_id ?? null, notif_new_reviews: prev?.notif_new_reviews ?? null, notif_urgent_alerts: prev?.notif_urgent_alerts ?? null, notif_weekly_digest: prev?.notif_weekly_digest ?? null, notif_monthly_report: prev?.notif_monthly_report ?? null, notif_sync_reminders: prev?.notif_sync_reminders ?? null, notif_rating_drops: prev?.notif_rating_drops ?? null }));

      if (hotelId) {
        const { error } = await supabase.from("hotels").update({ response_signature: responseSignature.trim() || "The Management Team" }).eq("id", hotelId);
        if (error) throw error;
        setHotel(prev => prev ? { ...prev, response_signature: responseSignature.trim() || "The Management Team" } : prev);
      }

      showToast("success", "Account saved");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save account");
    } finally {
      setSavingAccount(false);
    }
  }

  // ── Save: Hotel ────────────────────────────────────────────────────────────

  async function onSaveHotel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingHotel(true);
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!hotelName.trim()) throw new Error("Hotel name is required.");

      const { data: existing } = await supabase.from("hotels").select("id, locked_until").eq("user_id", user.id).maybeSingle();
      const room_count = roomCount.trim() === "" ? null : (parseInt(roomCount, 10) || null);
      const now = Date.now();
      const lockUntil = new Date(now + 28 * 24 * 60 * 60 * 1000).toISOString();
      const lockStartedAt = new Date(now).toISOString();

      const alwaysEditable = { address: address.trim() || null, city: city.trim() || null, country: country.trim() || null, postal_code: postalCode.trim() || null, phone: phone.trim() || null, website: website.trim() || null };
      const lockedFields = { name: hotelName.trim(), room_count };

      let saveError;
      if (!existing?.id) {
        const result = await supabase.from("hotels").insert({ ...alwaysEditable, ...lockedFields, user_id: user.id, locked_until: lockUntil, lock_started_at: lockStartedAt });
        saveError = result.error;
      } else {
        const existingLocked = !!(existing.locked_until && new Date(existing.locked_until as string) > new Date());
        const hotelData = existingLocked ? { ...alwaysEditable } : { ...alwaysEditable, ...lockedFields, locked_until: lockUntil, lock_started_at: lockStartedAt };
        const result = await supabase.from("hotels").update(hotelData).eq("user_id", user.id);
        saveError = result.error;
        if (!saveError) {
          const { data: refreshed } = await supabase.from("hotels").select("*").eq("user_id", user.id).maybeSingle();
          if (refreshed) setHotel(refreshed as HotelRow);
        }
      }

      if (saveError) throw saveError;
      showToast("success", "Hotel details saved");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save hotel");
    } finally {
      setSavingHotel(false);
    }
  }

  // ── Save: Platforms ────────────────────────────────────────────────────────

  async function onSavePlatforms(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hotelId) { showToast("error", "Set up your hotel details first."); return; }
    setSavingPlatforms(true);
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase.from("hotels").select("locked_until").eq("user_id", user.id).maybeSingle();
      const existingLocked = !!(existing?.locked_until && new Date(existing.locked_until as string) > new Date());

      const updateData: Record<string, unknown> = { active_platforms: activePlatforms };
      if (!existingLocked) {
        updateData.tripadvisor_url = tripadvisorUrl.trim() || null;
        updateData.google_url = googleUrl.trim() || null;
        updateData.booking_url = bookingUrl.trim() || null;
        updateData.trip_url = tripUrl.trim() || null;
        updateData.expedia_url = expediaUrl.trim() || null;
        updateData.yelp_url = yelpUrl.trim() || null;
        const coordMatch = googleUrl?.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (coordMatch) { updateData.latitude = parseFloat(coordMatch[1]!); updateData.longitude = parseFloat(coordMatch[2]!); }
      }

      const { error } = await supabase.from("hotels").update(updateData).eq("user_id", user.id);
      if (error) throw error;

      const { data: refreshed } = await supabase.from("hotels").select("*").eq("user_id", user.id).maybeSingle();
      if (refreshed) setHotel(refreshed as HotelRow);
      showToast("success", "Platform settings saved");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save platforms");
    } finally {
      setSavingPlatforms(false);
    }
  }

  // ── Hotel search ───────────────────────────────────────────────────────────

  async function runHotelSearch() {
    if (!searchName.trim()) return;
    setSearching(true);
    setSearchStep(0);
    setSearchResult(null);
    setSearchError(null);
    const stepTimer = window.setInterval(() => setSearchStep(s => Math.min(s + 1, 2)), 1200);
    try {
      const res = await fetch("/api/search-hotel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hotel_name: searchName.trim(), city: searchCity.trim() || undefined }) });
      const data = await res.json() as { success: true; hotel: HotelSearchResult } | { success: false; error: string };
      if (data.success) {
        const h = data.hotel;
        setSearchResult(h);
        setEditedUrls({ tripadvisor: h.tripadvisor_url ?? "", google: h.google_url ?? "", booking: h.booking_url ?? "", trip: h.trip_url ?? "", expedia: h.expedia_url ?? "", yelp: h.yelp_url ?? "" });
        if (!isLocked) {
          if (h.name) setHotelName(h.name);
          setTripadvisorUrl(h.tripadvisor_url ?? "");
          setGoogleUrl(h.google_url ?? "");
          setBookingUrl(h.booking_url ?? "");
          setTripUrl(h.trip_url ?? "");
          setExpediaUrl(h.expedia_url ?? "");
          setYelpUrl(h.yelp_url ?? "");
        }
        setAddress(h.address ?? ""); setCity(h.city ?? ""); setCountry(h.country ?? ""); setPostalCode(h.postal_code ?? ""); setPhone(h.phone ?? ""); setWebsite(h.website ?? "");
        setAutoFillMsg("✓ Details auto-filled — review and save");
        window.setTimeout(() => setAutoFillMsg(null), 3000);
      } else {
        setSearchError(data.error);
      }
    } catch { setSearchError("Search failed. Please try again."); }
    finally { window.clearInterval(stepTimer); setSearching(false); }
  }

  function applyAllUrls() {
    if (!searchResult) return;
    const eu = editedUrls;
    if (!isLocked) {
      if (searchResult.name) setHotelName(searchResult.name);
      setTripadvisorUrl(eu.tripadvisor || searchResult.tripadvisor_url || "");
      setGoogleUrl(eu.google || searchResult.google_url || "");
      setBookingUrl(eu.booking || searchResult.booking_url || "");
      setTripUrl(eu.trip || searchResult.trip_url || "");
      setExpediaUrl(eu.expedia || searchResult.expedia_url || "");
      setYelpUrl(eu.yelp || searchResult.yelp_url || "");
    }
    setAddress(searchResult.address ?? ""); setCity(searchResult.city ?? ""); setCountry(searchResult.country ?? ""); setPostalCode(searchResult.postal_code ?? ""); setPhone(searchResult.phone ?? ""); setWebsite(searchResult.website ?? "");
    setAutoFillMsg("✓ Details auto-filled — review and save");
    window.setTimeout(() => setAutoFillMsg(null), 3000);
  }

  async function onSaveNotifications(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    setSavingNotifications(true);
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const notifData = {
        notif_new_reviews: notifications.newReviews,
        notif_urgent_alerts: notifications.urgentAlerts,
        notif_weekly_digest: notifications.weeklyDigest,
        notif_monthly_report: notifications.monthlyReport,
        notif_sync_reminders: notifications.syncReminders,
        notif_rating_drops: notifications.ratingDropAlerts,
      };
      const { data: existing } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("profiles").update(notifData).eq("id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({ id: userId, ...notifData });
        if (error) throw error;
      }
      showToast("success", "Notification preferences saved");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save notifications");
    } finally {
      setSavingNotifications(false);
    }
  }

  // ── Input helpers ──────────────────────────────────────────────────────────

  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) { e.target.style.borderColor = "#3a3a3a"; }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) { e.target.style.borderColor = "#2a2a2a"; }

  // ── Platform URL map ───────────────────────────────────────────────────────

  const urlMap: Record<string, [string, (v: string) => void]> = {
    tripadvisor: [tripadvisorUrl, setTripadvisorUrl],
    google: [googleUrl, setGoogleUrl],
    booking: [bookingUrl, setBookingUrl],
    trip: [tripUrl, setTripUrl],
    expedia: [expediaUrl, setExpediaUrl],
    yelp: [yelpUrl, setYelpUrl],
  };

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="settings-page">
        <div style={{ marginBottom: 28 }}>
          <Skeleton width="160px" height="24px" radius="6px" />
          <Skeleton width="280px" height="16px" radius="4px" style={{ marginTop: 8 }} />
        </div>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1e1e1e", marginBottom: 32 }}>
          {[80, 60, 90, 70, 110].map((w, i) => <Skeleton key={i} width={`${w}px`} height="14px" radius="4px" style={{ marginRight: 24, marginBottom: 12 }} />)}
        </div>
        <div style={{ ...card, padding: 28 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ marginBottom: i < 3 ? 20 : 0 }}><Skeleton width="100px" height="12px" radius="3px" /><Skeleton height="42px" radius="6px" style={{ marginTop: 8 }} /></div>)}
        </div>
        <style dangerouslySetInnerHTML={{ __html: "@keyframes skeleton-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-page">
        <div style={{ ...card, padding: 24, color: "#f87171", fontSize: 14 }}>{error}</div>
      </div>
    );
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const TABS: { id: ActiveTab; label: string }[] = [
    { id: "account", label: "Account" },
    { id: "hotel", label: "Hotel" },
    { id: "platforms", label: "Platforms" },
    { id: "billing", label: "Billing" },
    { id: "notifications", label: "Notifications" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="settings-page">
      {/* PAGE HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f0f0f0", margin: "0 0 4px 0" }}>Settings</h1>
        <p style={{ fontSize: 12, color: "#555555", margin: 0 }}>Manage your account and hotel preferences</p>
      </div>

      {/* TABS */}
      <nav style={{ display: "flex", gap: 0, borderBottom: "1px solid #1e1e1e", marginBottom: 32 }}>
        {TABS.map(t => {
          const active = activeTab === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} style={{ padding: "8px 0", marginRight: 24, marginBottom: -1, fontSize: 13, fontWeight: 500, color: active ? "#f0f0f0" : "#555555", borderBottom: active ? "2px solid #f0f0f0" : "2px solid transparent", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1 — ACCOUNT                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {activeTab === "account" && (
        <form onSubmit={onSaveAccount} style={{ maxWidth: 720 }}>
          <div style={{ ...card, padding: 28, marginBottom: 0 }}>
            <SectionLabel>Personal Information</SectionLabel>

            {/* Two-column name grid */}
            <div className="settings-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label htmlFor="acc-full" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>Full name</label>
                <input id="acc-full" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Leonardo Baaijens" style={inp} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label htmlFor="acc-display" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>Display name</label>
                <input id="acc-display" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Leonardo" style={inp} onFocus={onFocus} onBlur={onBlur} />
                <p style={{ fontSize: 12, color: "#555555", margin: "4px 0 0 0" }}>Used in AI-generated responses</p>
              </div>
            </div>

            {/* Email — disabled */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="acc-email" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>Email address</label>
              <input id="acc-email" type="email" value={userEmail ?? ""} disabled readOnly style={{ ...inp, opacity: 0.5, cursor: "not-allowed" }} />
              <p style={{ fontSize: 12, color: "#555555", margin: "4px 0 0 0" }}>Email cannot be changed here</p>
            </div>

            {/* Response signature */}
            <div style={{ marginBottom: 0 }}>
              <label htmlFor="acc-sig" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>Response signature</label>
              <input id="acc-sig" type="text" value={responseSignature} onChange={e => setResponseSignature(e.target.value)} placeholder="The Management Team at Hotel Neo" style={inp} onFocus={onFocus} onBlur={onBlur} />
              <p style={{ fontSize: 12, color: "#555555", margin: "4px 0 8px 0" }}>Appears at the end of every AI response</p>
              {/* Preview */}
              <div style={{ background: "#0a0a0a", border: "1px solid #1e1e1e", borderRadius: 6, padding: "10px 14px" }}>
                <span style={{ fontSize: 12, color: "#555555", fontStyle: "italic" }}>
                  Kind regards, {responseSignature.trim() || "The Management Team"}
                </span>
              </div>
            </div>

            <hr style={divider} />
            <SectionLabel>Preferences</SectionLabel>

            <div style={{ maxWidth: 320 }}>
              <label htmlFor="acc-lang" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>Preferred language</label>
              <select id="acc-lang" value={preferredLanguage} onChange={e => setPreferredLanguage(e.target.value)} style={{ ...inp, appearance: "none", WebkitAppearance: "none" }} onFocus={onFocus} onBlur={onBlur}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <p style={{ fontSize: 12, color: "#555555", margin: "4px 0 0 0" }}>Used for review translations</p>
            </div>

            <SaveRow saving={savingAccount} label="Save account settings" />
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2 — HOTEL                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {activeTab === "hotel" && (
        <div style={{ maxWidth: 720 }}>
          {/* ── Find your hotel ── */}
          <div style={{ background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 8, padding: 20, marginBottom: 20, opacity: isLocked ? 0.5 : 1, pointerEvents: isLocked ? "none" : undefined }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#f0f0f0", marginBottom: 4 }}>Find your hotel automatically</div>
            <p style={{ fontSize: 12, color: "#555555", margin: "0 0 12px 0", lineHeight: 1.6 }}>Type your hotel name and we find all your details and review platform links automatically</p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="text" placeholder="Hotel Neo Malioboro" value={searchName} onChange={e => setSearchName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void runHotelSearch(); } }}
                style={{ flex: 2, minWidth: 160, ...inp }} onFocus={onFocus} onBlur={onBlur} />
              <input type="text" placeholder="City" value={searchCity} onChange={e => setSearchCity(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void runHotelSearch(); } }}
                style={{ flex: 1, minWidth: 100, ...inp }} onFocus={onFocus} onBlur={onBlur} />
              <button type="button" disabled={searching || !searchName.trim()} onClick={() => void runHotelSearch()}
                style={{ ...primaryBtn, opacity: searching || !searchName.trim() ? 0.5 : 1, cursor: searching || !searchName.trim() ? "not-allowed" : "pointer", flexShrink: 0 }}>
                {searching ? "Searching…" : "Find hotel"}
              </button>
            </div>

            {/* Loading steps */}
            {searching && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {["Searching Google Maps…", "Finding platform profiles…", "Auto-filling your details…"].map((msg, i) =>
                  searchStep >= i ? <div key={i} style={{ fontSize: 13, color: "#888888", animation: "step-fadein 0.4s ease" }}>{msg}</div> : null
                )}
              </div>
            )}

            {/* Error */}
            {searchError && !searching && <div style={{ marginTop: 12, fontSize: 13, color: "#f87171" }}>{searchError}</div>}

            {/* Results */}
            {searchResult && !searching && (
              <div style={{ ...card, marginTop: 12, padding: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#f0f0f0", marginBottom: 2 }}>{searchResult.name}</div>
                {searchResult.address && <div style={{ fontSize: 12, color: "#555555", marginBottom: 4 }}>{searchResult.address}</div>}
                {searchResult.avg_rating && (
                  <div style={{ fontSize: 12, color: "#888888", marginBottom: 12 }}>
                    ⭐ {searchResult.avg_rating.toFixed(1)}{searchResult.total_reviews ? ` · ${searchResult.total_reviews.toLocaleString()} reviews` : ""}
                  </div>
                )}

                {(["tripadvisor", "google", "booking", "trip", "expedia", "yelp"] as const).map(key => {
                  const meta = PLATFORMS.find(p => p.key === key)!;
                  const urlKey = key === "google" ? "google_url" : key === "tripadvisor" ? "tripadvisor_url" : key === "booking" ? "booking_url" : key === "trip" ? "trip_url" : key === "expedia" ? "expedia_url" : "yelp_url";
                  const foundUrl = searchResult[urlKey as keyof HotelSearchResult] as string | null;
                  const conf = searchResult.url_confidence?.[key] as "verified" | "search_page" | "not_found" | undefined;
                  const isEditing = editingUrls[key];
                  const currentVal = editedUrls[key] ?? foundUrl ?? "";

                  return (
                    <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid #1a2a1a", flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 30, height: 20, borderRadius: 4, fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color, flexShrink: 0, marginTop: 2 }}>{meta.badge}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isEditing ? (
                          <input type="url" value={currentVal} onChange={e => setEditedUrls(prev => ({ ...prev, [key]: e.target.value }))}
                            style={{ width: "100%", background: "#111111", border: "1px solid #2a2a2a", borderRadius: 4, padding: "5px 10px", color: "#f0f0f0", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                        ) : foundUrl || currentVal ? (
                          <span style={{ fontSize: 12, color: "#888888", wordBreak: "break-all" }}>{currentVal.length > 48 ? `${currentVal.slice(0, 48)}…` : currentVal}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#444444" }}>Not found</span>
                        )}
                        {conf && conf !== "not_found" && !isEditing && (
                          <span style={{ display: "inline-block", marginLeft: 6, padding: "1px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600, background: conf === "verified" ? "#052e16" : "#1a1200", color: conf === "verified" ? "#4ade80" : "#fbbf24" }}>
                            {conf === "verified" ? "✓ Verified" : "⚠ Check URL"}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {(foundUrl || currentVal) && !isEditing && (
                          <button type="button" onClick={() => { const val = currentVal || foundUrl || ""; const [, setter] = urlMap[key] ?? ["", () => {}]; setter(val); showToast("success", `${meta.label} URL applied`); }}
                            style={{ background: "#f0f0f0", border: "none", borderRadius: 4, padding: "3px 9px", fontSize: 11, fontWeight: 600, color: "#0d0d0d", cursor: "pointer", fontFamily: "inherit" }}>✓ Use</button>
                        )}
                        <button type="button" onClick={() => setEditingUrls(prev => ({ ...prev, [key]: !prev[key] }))}
                          style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: 4, padding: "3px 9px", fontSize: 11, color: "#888888", cursor: "pointer", fontFamily: "inherit" }}>
                          {isEditing ? "Done" : "Edit"}
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button type="button" onClick={applyAllUrls} style={{ ...primaryBtn, width: "100%", marginTop: 14, padding: "10px 0" }}>Apply all details →</button>
              </div>
            )}
          </div>

          {/* Auto-fill message */}
          {autoFillMsg && (
            <div style={{ background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 6, padding: "10px 14px", fontSize: 12, color: "#4ade80", marginBottom: 16 }}>{autoFillMsg}</div>
          )}

          <form onSubmit={onSaveHotel}>
            {/* ── Property details ── */}
            <div style={{ ...card, padding: 28, marginBottom: 16 }}>
              <SectionLabel>Property Details</SectionLabel>
              <div className="settings-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label htmlFor="h-name" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>Hotel name <span style={{ color: "#f87171" }}>*</span></label>
                  <input id="h-name" type="text" required value={hotelName} onChange={e => setHotelName(e.target.value)} placeholder="My Boutique Hotel" disabled={isLocked}
                    title={isLocked ? `Locked for ${daysRemaining} more days` : undefined}
                    style={{ ...inp, opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : undefined }}
                    onFocus={e => { if (!isLocked) onFocus(e); }} onBlur={onBlur} />
                  {isLocked && <p style={{ fontSize: 12, color: "#fbbf24", margin: "4px 0 0 0" }}>🔒 Locked for {daysRemaining} days</p>}
                </div>
                <div>
                  <label htmlFor="h-rooms" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>Number of rooms</label>
                  <input id="h-rooms" type="number" min={1} value={roomCount} onChange={e => setRoomCount(e.target.value)} placeholder="48" disabled={isLocked}
                    style={{ ...inp, opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : undefined }}
                    onFocus={e => { if (!isLocked) onFocus(e); }} onBlur={onBlur} />
                </div>
                <div>
                  <label htmlFor="h-phone" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>Phone number</label>
                  <input id="h-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+62 274 123456" style={inp} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label htmlFor="h-web" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>Website</label>
                  <input id="h-web" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourhotel.com" style={inp} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
            </div>

            {/* ── Location ── */}
            <div style={{ ...card, padding: 28, marginBottom: 16 }}>
              <SectionLabel>Location</SectionLabel>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="h-addr" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>Street address</label>
                <input id="h-addr" type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Jalan Pasar Kembang No. 21" style={inp} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div className="settings-3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 12 }}>
                <div>
                  <label htmlFor="h-city" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>City</label>
                  <input id="h-city" type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Yogyakarta" style={inp} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label htmlFor="h-country" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>Country</label>
                  <input id="h-country" type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Indonesia" style={inp} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label htmlFor="h-postal" style={{ display: "block", fontSize: 13, color: "#888888", marginBottom: 6 }}>Postal code</label>
                  <input id="h-postal" type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="55271" style={inp} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#444444", fontStyle: "italic", margin: 0 }}>Location is used for competitor discovery and map features</p>
            </div>

            {/* ── Hotel lock status ── */}
            {hotel && (
              <div style={{ marginBottom: 16 }}>
                {isLocked ? (
                  <div style={{ background: "#1a1200", border: "1px solid #2a2000", borderRadius: 8, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span>🔒</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>Hotel locked for editing</span>
                      </div>
                      <span style={{ fontSize: 12, color: "#555555" }}>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#444444", marginTop: 6 }}>Locked until {lockedUntilFormatted}</div>
                    <div style={{ fontSize: 11, color: "#555555", marginTop: 8 }}>
                      <a href="mailto:support@guestpulse.app" style={{ color: "#555555", textDecoration: "underline" }}>Contact support to unlock early →</a>
                    </div>
                  </div>
                ) : (
                  <div style={{ ...card, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span>🔓</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#4ade80" }}>Hotel is editable</span>
                      </div>
                      <span style={{ fontSize: 12, color: "#555555" }}>Will lock for 28 days on next save</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <SaveRow saving={savingHotel} label="Save hotel details" />
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3 — PLATFORMS                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {activeTab === "platforms" && (
        <div style={{ maxWidth: 720 }}>
          {!hotelId && (
            <div style={{ ...card, padding: 24, color: "#888888", fontSize: 13, marginBottom: 20 }}>
              Set up your hotel details first before adding platform URLs.
            </div>
          )}

          <form onSubmit={onSavePlatforms}>
            {/* ── Platform URL cards ── */}
            <div style={{ ...card, padding: 28, marginBottom: 16 }}>
              <SectionLabel>Review Platform URLs</SectionLabel>
              <p style={{ fontSize: 12, color: "#555555", margin: "0 0 20px 0", lineHeight: 1.6 }}>
                Add your hotel page URLs from each platform to enable automatic review syncing
              </p>

              {PLATFORMS.map(meta => {
                const [urlVal, setUrlVal] = urlMap[meta.key] ?? ["", () => {}];
                const hasUrl = !!urlVal.trim();
                const hasSynced = !!hotel?.last_sync_at;
                let statusDot = "#444444";
                let statusLabel = "Not connected";
                let statusColor = "#444444";
                if (hasUrl && hasSynced) { statusDot = "#4ade80"; statusLabel = "Connected"; statusColor = "#4ade80"; }
                else if (hasUrl) { statusDot = "#fbbf24"; statusLabel = "Not synced yet"; statusColor = "#fbbf24"; }

                return (
                  <div key={meta.key} style={{ ...card, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 48, height: 32, borderRadius: 6, background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {meta.badge}
                    </div>
                    {/* Input area */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#f0f0f0", marginBottom: 6 }}>{meta.label}</div>
                      <input type="url" value={urlVal} onChange={e => setUrlVal(e.target.value)} placeholder="https://..." disabled={isLocked}
                        style={{ ...inp, height: 34, padding: "0 12px", fontSize: 13, opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : undefined }}
                        onFocus={e => { if (!isLocked) onFocus(e); }} onBlur={onBlur} />
                    </div>
                    {/* Status */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusDot, display: "inline-block" }} />
                      <span style={{ fontSize: 11, color: statusColor }}>{statusLabel}</span>
                    </div>
                  </div>
                );
              })}

              {isLocked && (
                <p style={{ fontSize: 12, color: "#fbbf24", margin: "8px 0 0 0" }}>
                  🔒 URLs are locked for {daysRemaining} more days. You can still update active platforms below.
                </p>
              )}
            </div>

            {/* ── Active platforms grid ── */}
            <div style={{ ...card, padding: 28, marginBottom: 0 }}>
              <SectionLabel>Active Platforms</SectionLabel>
              <p style={{ fontSize: 12, color: "#555555", margin: "0 0 16px 0" }}>Choose which platforms to include when syncing reviews</p>

              <div className="settings-platform-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {PLATFORMS.map(meta => {
                  const [urlVal] = urlMap[meta.key] ?? ["", () => {}];
                  const hasUrl = !!urlVal.trim();
                  const active = activePlatforms[meta.key];
                  return (
                    <div key={meta.key}
                      title={!hasUrl ? "Add URL above to enable this platform" : undefined}
                      onClick={() => { if (!hasUrl) return; setActivePlatforms(prev => ({ ...prev, [meta.key]: !prev[meta.key] })); }}
                      style={{ background: active && hasUrl ? "#0a1a0a" : "#111111", border: `1px solid ${active && hasUrl ? "#4ade80" : "#2a2a2a"}`, borderRadius: 6, padding: "10px 14px", cursor: hasUrl ? "pointer" : "not-allowed", opacity: hasUrl ? 1 : 0.4, display: "flex", alignItems: "center", gap: 10, userSelect: "none", transition: "border-color 0.15s, background 0.15s" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 26, height: 18, borderRadius: 3, fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color, flexShrink: 0 }}>{meta.badge}</span>
                      <span style={{ fontSize: 13, color: "#f0f0f0", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.label}</span>
                      {active && hasUrl
                        ? <span style={{ color: "#4ade80", fontSize: 13, flexShrink: 0 }}>✓</span>
                        : <span style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid #2a2a2a", flexShrink: 0, display: "inline-block" }} />
                      }
                    </div>
                  );
                })}
              </div>

              <SaveRow saving={savingPlatforms} label="Save platform settings" />
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 4 — BILLING                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {activeTab === "billing" && (
        <div style={{ maxWidth: 720 }}>
          <div style={{ ...card, padding: 28, marginBottom: 16 }}>
            <SectionLabel>Current Plan</SectionLabel>

            {/* FREE */}
            {billingPlan === "free" && (
              <div>
                <div style={{ display: "inline-block", background: "#1e1e1e", color: "#555555", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 100, marginBottom: 12 }}>Free Plan</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: "#f0f0f0", marginBottom: 4 }}>Free</div>
                <p style={{ fontSize: 13, color: "#555555", margin: "0 0 20px 0", lineHeight: 1.6 }}>Upgrade to access AI features, unlimited syncing, and competitor benchmarking</p>

                {/* Feature comparison */}
                <div className="settings-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24, padding: "20px 0", borderTop: "1px solid #1e1e1e", borderBottom: "1px solid #1e1e1e" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#555555", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Free</div>
                    {["10 AI drafts/month", "Manual sync only", "3 platforms", "Basic dashboard"].map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ color: "#555555", fontSize: 13 }}>✗</span>
                        <span style={{ fontSize: 13, color: "#555555" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#4ade80", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Pro</div>
                    {["Unlimited AI drafts", "Auto daily sync", "6 platforms", "Full sentiment dashboard", "Competitor benchmarking", "Email digest"].map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ color: "#4ade80", fontSize: 13 }}>✓</span>
                        <span style={{ fontSize: 13, color: "#f0f0f0" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 500, color: "#f0f0f0" }}>$99</span>
                  <span style={{ fontSize: 14, color: "#555555" }}>/mo</span>
                </div>
                <p style={{ fontSize: 12, color: "#444444", margin: "0 0 16px 0" }}>7-day free trial · No credit card required</p>
                <button type="button" onClick={() => router.push("/dashboard/pricing")}
                  style={{ ...primaryBtn, width: "100%", padding: "11px 0", fontSize: 14 }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#e0e0e0"; }} onMouseLeave={e => { e.currentTarget.style.background = "#f0f0f0"; }}>
                  Start free trial
                </button>
              </div>
            )}

            {/* TRIALING */}
            {billingPlan === "trialing" && (
              <div style={{ background: "#111111", border: "1px solid #2a2000", borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Trial Active</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: "#f0f0f0", marginBottom: 4 }}>
                  {profile?.subscription_plan ? `${profile.subscription_plan.charAt(0).toUpperCase()}${profile.subscription_plan.slice(1)}` : "Professional"} — Trial
                </div>
                <p style={{ fontSize: 13, color: "#888888", margin: "0 0 16px 0" }}>Your trial is active. Upgrade before it ends to keep access.</p>
                <button type="button" onClick={() => router.push("/dashboard/pricing")}
                  style={{ ...primaryBtn }} onMouseEnter={e => { e.currentTarget.style.background = "#e0e0e0"; }} onMouseLeave={e => { e.currentTarget.style.background = "#f0f0f0"; }}>
                  Manage subscription
                </button>
              </div>
            )}

            {/* ACTIVE */}
            {billingPlan === "active" && (() => {
              const plan = profile?.subscription_plan ?? "professional";
              const isEssential = plan === "essential";
              const isBusiness = plan === "business";
              const accentColor = isEssential ? "#888888" : isBusiness ? "#60a5fa" : "#4ade80";
              const planLabel = isEssential ? "Essential" : isBusiness ? "Multi-property" : "Professional";
              return (
                <div style={{ background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: 8, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>PRO ✓</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: "#f0f0f0", marginBottom: 4 }}>You&apos;re on the {planLabel} plan</div>
                  <p style={{ fontSize: 13, color: "#4ade80", margin: "0 0 4px 0" }}>All features unlocked</p>
                  <p style={{ fontSize: 13, color: "#888888", margin: "0 0 16px 0" }}>Billing managed via Stripe</p>
                  <button type="button" onClick={() => router.push("/dashboard/pricing")}
                    style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: 6, padding: "7px 16px", color: "#888888", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#3a3a3a"; e.currentTarget.style.color = "#aaaaaa"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#888888"; }}>
                    Manage subscription →
                  </button>
                </div>
              );
            })()}

            {/* PAST DUE */}
            {billingPlan === "past_due" && (
              <div style={{ background: "#111111", border: "1px solid #3a1a1a", borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Payment Failed</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: "#f0f0f0", marginBottom: 8 }}>Update billing to restore access</div>
                <button type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/stripe-portal", { method: "POST" });
                      const data = await res.json() as { url?: string; error?: string };
                      if (data.url) { window.location.href = data.url; }
                      else { showToast("error", data.error ?? "Could not open billing portal"); }
                    } catch { showToast("error", "Could not open billing portal"); }
                  }}
                  style={{ ...primaryBtn }} onMouseEnter={e => { e.currentTarget.style.background = "#e0e0e0"; }} onMouseLeave={e => { e.currentTarget.style.background = "#f0f0f0"; }}>
                  Update billing
                </button>
              </div>
            )}
          </div>

          {/* Billing history */}
          <div style={{ ...card, padding: 24 }}>
            <SectionLabel>Billing History</SectionLabel>
            <div style={{ fontSize: 13, color: "#555555" }}>
              {billingPlan === "free" ? "No billing history yet." : "Invoices are managed in the Stripe customer portal."}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 5 — NOTIFICATIONS                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {activeTab === "notifications" && (
        <div style={{ maxWidth: 720 }}>
          <form onSubmit={onSaveNotifications}>
            <div style={{ ...card, padding: 28 }}>
              <SectionLabel>Email Notifications</SectionLabel>
              <p style={{ fontSize: 12, color: "#555555", margin: "0 0 20px 0" }}>Choose what emails GuestPulse sends you</p>

              {(
                [
                  { key: "newReviews" as const, title: "New review alerts", desc: "Get notified when a new review is posted" },
                  { key: "urgentAlerts" as const, title: "Urgent review alerts", desc: "Instant alert when a 1 or 2 star review comes in" },
                  { key: "weeklyDigest" as const, title: "Weekly digest", desc: "Monday morning summary of your reviews" },
                  { key: "monthlyReport" as const, title: "Monthly report", desc: "Monthly overview of your reputation" },
                  { key: "syncReminders" as const, title: "Sync reminders", desc: "Remind me if no sync in 7 days" },
                  { key: "ratingDropAlerts" as const, title: "Rating drop alerts", desc: "Alert when your average drops by 0.2 or more" },
                ] as const
              ).map((row, i, arr) => (
                <div key={row.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, background: "#141414", border: "1px solid #1e1e1e", borderRadius: 8, padding: "14px 18px", marginBottom: i < arr.length - 1 ? 8 : 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#f0f0f0" }}>{row.title}</div>
                    <div style={{ fontSize: 12, color: "#555555", marginTop: 2 }}>{row.desc}</div>
                  </div>
                  <ToggleSwitch checked={notifications[row.key]} onChange={v => setNotifications(prev => ({ ...prev, [row.key]: v }))} />
                </div>
              ))}

              <SaveRow saving={savingNotifications} label="Save notification preferences" />
            </div>
          </form>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div role="status" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, background: toast.type === "success" ? "#0a1a0a" : "#1a0a0a", border: `1px solid ${toast.type === "success" ? "#1a3a1a" : "#3a1a1a"}`, borderRadius: 8, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, maxWidth: 340, animation: "toast-in 0.3s ease forwards", boxShadow: "none" }}>
          <span style={{ fontSize: 13, color: toast.type === "success" ? "#4ade80" : "#f87171", fontWeight: 600 }}>{toast.type === "success" ? "✓" : "!"}</span>
          <span style={{ fontSize: 13, color: toast.type === "success" ? "#f0f0f0" : "#f87171" }}>{toast.message}</span>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toast-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes skeleton-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes step-fadein { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
        @media (max-width: 768px) {
          .settings-2col { grid-template-columns: 1fr !important; }
          .settings-3col { grid-template-columns: 1fr 1fr !important; }
          .settings-platform-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .settings-3col { grid-template-columns: 1fr !important; }
          .settings-platform-grid { grid-template-columns: 1fr !important; }
        }
      ` }} />
    </div>
  );
}
