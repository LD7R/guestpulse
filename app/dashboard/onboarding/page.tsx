"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import FirstSyncExperience from "@/components/FirstSyncExperience";

/* ─── tokens ─────────────────────────────────────────────── */
const BG = "#0d0d0d";
const CARD = "#141414";
const BORDER = "#1e1e1e";
const TEXT = "#f0f0f0";
const MUTED = "#888888";
const GREEN = "#4ade80";
const DANGER = "#f87171";

/* ─── shared styles ──────────────────────────────────────── */
const card: CSSProperties = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  width: "100%",
  maxWidth: 560,
  padding: "40px 40px",
  boxSizing: "border-box",
};

const input: CSSProperties = {
  width: "100%",
  background: "#111111",
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  padding: "10px 14px",
  color: TEXT,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const btn: CSSProperties = {
  height: 44,
  borderRadius: 6,
  border: "none",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const primaryBtn: CSSProperties = {
  ...btn,
  background: TEXT,
  color: BG,
  padding: "0 24px",
};

const ghostBtn: CSSProperties = {
  ...btn,
  background: "transparent",
  border: `1px solid ${BORDER}`,
  color: MUTED,
  padding: "0 20px",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: MUTED,
  marginBottom: 6,
  fontWeight: 500,
};

/* ─── badge component helpers ────────────────────────────── */
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 6px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        color: BG,
        background: color,
        marginRight: 4,
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </span>
  );
}

/* ─── progress indicator ─────────────────────────────────── */
function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        justifyContent: "center",
        marginBottom: 32,
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: done ? GREEN : active ? TEXT : "#2a2a2a",
                color: done || active ? BG : "#555555",
                border: done ? "none" : active ? "none" : `1px solid #333333`,
                transition: "all 0.2s",
              }}
            >
              {done ? <span className="gp-check-pop">✓</span> : idx}
            </div>
            {i < total - 1 && (
              <div
                style={{
                  width: 32,
                  height: 2,
                  background: done ? GREEN : "#2a2a2a",
                  borderRadius: 1,
                  transition: "background 0.3s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  /* step 2 state */
  const [hotelName, setHotelName] = useState("");
  const [tripadvisorUrl, setTripadvisorUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [tripUrl, setTripUrl] = useState("");
  const [expediaUrl, setExpediaUrl] = useState("");
  const [yelpUrl, setYelpUrl] = useState("");
  const [obAddress, setObAddress] = useState("");
  const [obCity, setObCity] = useState("");
  const [obCountry, setObCountry] = useState("");
  const [obPhone, setObPhone] = useState("");
  const [obWebsite, setObWebsite] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedHotelId, setSavedHotelId] = useState<string | null>(null);

  /* AI hotel search state */
  const [searchCity, setSearchCity] = useState("");
  const [searchStage, setSearchStage] = useState<"idle" | "searching" | "complete">("idle");
  const [searchSteps, setSearchSteps] = useState<{ text: string; done: boolean }[]>([]);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  /* step 3 state */
  const [syncStarted, setSyncStarted] = useState(false);

  /* ── AI hotel search ─────────────────────────────────────── */
  async function handleAISearch() {
    if (!hotelName.trim()) return;
    setSearchStage("searching");
    setSearchErr(null);
    setSearchSteps([{ text: "Searching hotel databases...", done: false }]);

    // Start API call in parallel with the fake progress steps
    const apiPromise = fetch("/api/search-hotel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotel_name: hotelName.trim(),
        city: searchCity.trim() || undefined,
      }),
    });

    await new Promise<void>((r) => setTimeout(r, 600));
    setSearchSteps([
      { text: "Searching hotel databases...", done: true },
      { text: "Identifying review platforms...", done: false },
    ]);

    await new Promise<void>((r) => setTimeout(r, 700));
    setSearchSteps([
      { text: "Searching hotel databases...", done: true },
      { text: "Identifying review platforms...", done: true },
      { text: "Locating TripAdvisor profile...", done: false },
    ]);

    await new Promise<void>((r) => setTimeout(r, 500));
    setSearchSteps([
      { text: "Searching hotel databases...", done: true },
      { text: "Identifying review platforms...", done: true },
      { text: "Locating TripAdvisor profile...", done: true },
      { text: "Locating Google Maps profile...", done: false },
    ]);

    await new Promise<void>((r) => setTimeout(r, 500));
    setSearchSteps([
      { text: "Searching hotel databases...", done: true },
      { text: "Identifying review platforms...", done: true },
      { text: "Locating TripAdvisor profile...", done: true },
      { text: "Locating Google Maps profile...", done: true },
      { text: "Cross-referencing details...", done: false },
    ]);

    try {
      const res = await apiPromise;
      const data = (await res.json()) as
        | {
            success: true;
            hotel: {
              name: string;
              google_url: string | null;
              tripadvisor_url: string | null;
              booking_url: string | null;
              trip_url: string | null;
              expedia_url: string | null;
              yelp_url: string | null;
              address: string | null;
              city: string | null;
              country: string | null;
              phone: string | null;
              website: string | null;
            };
          }
        | { success: false; error: string };

      // Mark last step done
      setSearchSteps([
        { text: "Searching hotel databases...", done: true },
        { text: "Identifying review platforms...", done: true },
        { text: "Locating TripAdvisor profile...", done: true },
        { text: "Locating Google Maps profile...", done: true },
        { text: "Cross-referencing details...", done: true },
      ]);

      await new Promise<void>((r) => setTimeout(r, 400));

      if (data.success) {
        const h = data.hotel;
        if (h.name) setHotelName(h.name);
        setGoogleUrl(h.google_url ?? "");
        setTripadvisorUrl(h.tripadvisor_url ?? "");
        setBookingUrl(h.booking_url ?? "");
        setTripUrl(h.trip_url ?? "");
        setExpediaUrl(h.expedia_url ?? "");
        setYelpUrl(h.yelp_url ?? "");
        setObAddress(h.address ?? "");
        setObCity(h.city ?? "");
        if (h.city) setSearchCity(h.city);
        setObCountry(h.country ?? "");
        setObPhone(h.phone ?? "");
        setObWebsite(h.website ?? "");
        setShowDetails(true);
        setSearchStage("complete");
      } else {
        setSearchErr(data.error);
        setSearchStage("idle");
      }
    } catch {
      setSearchErr("Search failed. Please try again.");
      setSearchStage("idle");
    }
  }

  /* ── step 2: save hotel ─────────────────────────────────── */
  async function saveHotel() {
    if (!hotelName.trim()) {
      setSaveError("Hotel name is required.");
      return;
    }
    const urlFields = [tripadvisorUrl, googleUrl, bookingUrl, tripUrl, expediaUrl, yelpUrl];
    const hasUrl = urlFields.some((u) => u.trim());
    if (!hasUrl) {
      setSaveError("Add at least one platform URL so we can fetch your reviews.");
      return;
    }
    const invalidUrl = urlFields.find((u) => u.trim() && !u.trim().startsWith("http"));
    if (invalidUrl) {
      setSaveError("Please enter a valid URL starting with https://");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      setSaveError(userErr?.message ?? "Not signed in.");
      setSaving(false);
      return;
    }

    const hotelData: Record<string, unknown> = {
      name: hotelName.trim(),
      tripadvisor_url: tripadvisorUrl.trim() || null,
      google_url: googleUrl.trim() || null,
      booking_url: bookingUrl.trim() || null,
      trip_url: tripUrl.trim() || null,
      expedia_url: expediaUrl.trim() || null,
      yelp_url: yelpUrl.trim() || null,
      address: obAddress.trim() || null,
      city: obCity.trim() || null,
      country: obCountry.trim() || null,
      phone: obPhone.trim() || null,
      website: obWebsite.trim() || null,
    };

    /* extract coords from Google Maps URL */
    const coordMatch = googleUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      hotelData.latitude = parseFloat(coordMatch[1]!);
      hotelData.longitude = parseFloat(coordMatch[2]!);
    }

    const { data: existing } = await supabase
      .from("hotels")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let hotelId: string | null = null;
    if (existing?.id) {
      const { error } = await supabase
        .from("hotels")
        .update(hotelData)
        .eq("user_id", user.id);
      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }
      hotelId = existing.id as string;
    } else {
      const { data: inserted, error } = await supabase
        .from("hotels")
        .insert({ ...hotelData, user_id: user.id })
        .select("id")
        .single();
      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }
      hotelId = (inserted as { id: string }).id;
    }

    setSavedHotelId(hotelId);
    setSaving(false);
    setStep(3);
  }

  /* ── helpers ─────────────────────────────────────────────── */
  const foundPlatformCount = [tripadvisorUrl, googleUrl, bookingUrl, tripUrl, expediaUrl, yelpUrl]
    .filter((u) => u.trim()).length;

  const platformsForSync = [
    { platform: "tripadvisor", url: tripadvisorUrl.trim(), label: "TripAdvisor" },
    { platform: "google", url: googleUrl.trim(), label: "Google Maps" },
    { platform: "booking", url: bookingUrl.trim(), label: "Booking.com" },
    { platform: "trip", url: tripUrl.trim(), label: "Trip.com" },
    { platform: "expedia", url: expediaUrl.trim(), label: "Expedia" },
    { platform: "yelp", url: yelpUrl.trim(), label: "Yelp" },
  ].filter((p) => p.url);

  function handleSyncComplete() {
    sessionStorage.setItem("gp_just_onboarded", "true");
    router.push("/dashboard");
  }

  /* ─── render ──────────────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxSizing: "border-box",
      }}
    >
      {/* top bar */}
      <div
        style={{
          width: "100%",
          height: 52,
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>GuestPulse</span>
      </div>

      {/* content — key={step} triggers gp-fade-in re-mount on step change */}
      <div
        key={step}
        className="gp-fade-in"
        style={{
          flex: 1,
          display: "flex",
          alignItems: step === 3 && syncStarted ? "flex-start" : "center",
          justifyContent: "center",
          width: "100%",
          padding: "40px 24px",
          boxSizing: "border-box",
        }}
      >
        {/* ═══════ STEP 1 ═══════ */}
        {step === 1 && (
          <div style={card}>
            <StepIndicator step={1} total={3} />
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: TEXT,
                margin: "0 0 8px",
                letterSpacing: "-0.4px",
              }}
            >
              Welcome to GuestPulse
            </h1>
            <p style={{ fontSize: 14, color: MUTED, margin: "0 0 28px", lineHeight: 1.6 }}>
              Your AI-powered review intelligence platform. Set up in 2 minutes.
            </p>

            <div style={{ marginBottom: 32 }}>
              {[
                "Aggregate reviews from TripAdvisor, Google, Booking.com, and more",
                "AI sentiment analysis across all languages",
                "Identify your top complaint topics and strengths",
                "Track how you compare against local competitors",
                "Auto-sync keeps reviews fresh — no manual work",
              ].map((feat) => (
                <div
                  key={feat}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}
                >
                  <span style={{ color: GREEN, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#cccccc", lineHeight: 1.5 }}>{feat}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              style={{ ...primaryBtn, width: "100%", height: 48 }}
            >
              Get started →
            </button>
          </div>
        )}

        {/* ═══════ STEP 2 ═══════ */}
        {step === 2 && (
          <div style={card}>
            <StepIndicator step={2} total={3} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: "0 0 6px" }}>
              Set up your hotel
            </h2>
            <p style={{ fontSize: 13, color: MUTED, margin: "0 0 28px", lineHeight: 1.5 }}>
              Add your hotel name and paste your listing URLs.
            </p>

            {/* AI Search box */}
            <div
              style={{
                background: "#111111",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: MUTED,
                  marginBottom: 10,
                }}
              >
                Find your hotel automatically
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Hotel name"
                  value={hotelName}
                  onChange={(e) => {
                    setHotelName(e.target.value);
                    if (searchStage === "complete") setSearchStage("idle");
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleAISearch(); }}
                  style={{ ...input, flex: 2, minWidth: 140 }}
                />
                <input
                  type="text"
                  placeholder="City (optional)"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleAISearch(); }}
                  style={{ ...input, flex: 1, minWidth: 100 }}
                />
                <button
                  type="button"
                  disabled={searchStage === "searching" || !hotelName.trim()}
                  onClick={() => void handleAISearch()}
                  style={{
                    ...primaryBtn,
                    flexShrink: 0,
                    opacity: searchStage === "searching" || !hotelName.trim() ? 0.55 : 1,
                    cursor: searchStage === "searching" || !hotelName.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {searchStage === "searching" ? "Searching…" : "Find →"}
                </button>
              </div>

              {/* AI Working visualization */}
              {searchStage === "searching" && (
                <div
                  className="gp-fade-in"
                  style={{
                    background: "#0a1a0a",
                    border: "1px solid #1a3a1a",
                    borderRadius: 8,
                    padding: 16,
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: GREEN,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: GREEN,
                        display: "inline-block",
                        animation: "gpPulse 1s ease-in-out infinite",
                      }}
                    />
                    AI Working
                  </div>
                  {searchSteps.map((s, i) => (
                    <div
                      key={i}
                      className="gp-fade-in"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "5px 0",
                        fontSize: 12,
                        color: s.done ? "#555555" : TEXT,
                      }}
                    >
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: s.done ? "#0a1a0a" : "transparent",
                          border: s.done ? "1px solid #1a3a1a" : "1.5px solid #444",
                          color: GREEN,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {s.done ? (
                          <span className="gp-check-pop">✓</span>
                        ) : (
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#fbbf24",
                              animation: "gpPulse 1s ease-in-out infinite",
                            }}
                          />
                        )}
                      </span>
                      <span>{s.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Search complete — success card */}
              {searchStage === "complete" && (
                <div
                  className="gp-fade-in gp-celebrate"
                  style={{
                    background: "#0a1a0a",
                    border: "1px solid #1a3a1a",
                    borderRadius: 8,
                    padding: 16,
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span
                    className="gp-check-pop"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: GREEN,
                      color: BG,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{hotelName}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                      Found across {foundPlatformCount} platform{foundPlatformCount !== 1 ? "s" : ""} · Review the details below
                    </div>
                  </div>
                </div>
              )}

              {/* Search error */}
              {searchErr && searchStage === "idle" && (
                <div style={{ marginTop: 8, fontSize: 12, color: DANGER }}>{searchErr}</div>
              )}
            </div>

            {/* Hotel name */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="ob-name">
                Hotel name <span style={{ color: DANGER }}>*</span>
              </label>
              <input
                id="ob-name"
                type="text"
                placeholder="The Grand Hotel"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                style={input}
              />
            </div>

            {/* Platform URLs */}
            {[
              { id: "ob-ta", label: "TripAdvisor URL", badge: "TA", color: GREEN, value: tripadvisorUrl, set: setTripadvisorUrl, placeholder: "https://tripadvisor.com/Hotel_Review-..." },
              { id: "ob-go", label: "Google Maps URL", badge: "GO", color: "#60a5fa", value: googleUrl, set: setGoogleUrl, placeholder: "https://maps.google.com/..." },
              { id: "ob-bk", label: "Booking.com URL", badge: "BK", color: "#a78bfa", value: bookingUrl, set: setBookingUrl, placeholder: "https://booking.com/hotel/..." },
              { id: "ob-tc", label: "Trip.com URL", badge: "TC", color: "#60a5fa", value: tripUrl, set: setTripUrl, placeholder: "https://trip.com/hotels/..." },
              { id: "ob-ex", label: "Expedia URL", badge: "EX", color: "#a78bfa", value: expediaUrl, set: setExpediaUrl, placeholder: "https://expedia.com/..." },
              { id: "ob-yp", label: "Yelp URL", badge: "YP", color: DANGER, value: yelpUrl, set: setYelpUrl, placeholder: "https://yelp.com/biz/..." },
            ].map(({ id, label, badge, color, value, set, placeholder }) => (
              <div key={id} style={{ marginBottom: 12 }}>
                <label style={labelStyle} htmlFor={id}>
                  <Badge label={badge} color={color} />
                  {label}
                </label>
                <input
                  id={id}
                  type="url"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  style={input}
                />
              </div>
            ))}

            {/* Collapsible hotel details */}
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "6px 0",
                  fontSize: 12,
                  color: MUTED,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>Hotel details (auto-filled)</span>
                <span>{showDetails ? "↑" : "↓"}</span>
              </button>

              {showDetails && (
                <div
                  style={{
                    borderTop: `1px solid ${BORDER}`,
                    paddingTop: 14,
                    marginTop: 4,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div>
                    <label style={labelStyle} htmlFor="ob-addr">Address</label>
                    <input id="ob-addr" type="text" placeholder="Street address" value={obAddress} onChange={(e) => setObAddress(e.target.value)} style={input} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={labelStyle} htmlFor="ob-city">City</label>
                      <input id="ob-city" type="text" placeholder="City" value={obCity} onChange={(e) => setObCity(e.target.value)} style={input} />
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="ob-country">Country</label>
                      <input id="ob-country" type="text" placeholder="Country" value={obCountry} onChange={(e) => setObCountry(e.target.value)} style={input} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={labelStyle} htmlFor="ob-phone">Phone</label>
                      <input id="ob-phone" type="tel" placeholder="+1 555 000 0000" value={obPhone} onChange={(e) => setObPhone(e.target.value)} style={input} />
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="ob-web">Website</label>
                      <input id="ob-web" type="url" placeholder="https://" value={obWebsite} onChange={(e) => setObWebsite(e.target.value)} style={input} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {saveError && (
              <div
                style={{
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  borderRadius: 6,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: DANGER,
                  marginBottom: 16,
                }}
              >
                {saveError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setStep(1)} style={ghostBtn}>
                ← Back
              </button>
              <button
                type="button"
                onClick={() => void saveHotel()}
                disabled={saving}
                style={{
                  ...primaryBtn,
                  flex: 1,
                  opacity: saving ? 0.65 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {saving ? (
                  <>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: "2px solid rgba(0,0,0,0.25)",
                        borderTopColor: BG,
                        display: "inline-block",
                        animation: "ob-spin 0.7s linear infinite",
                      }}
                    />
                    Saving…
                  </>
                ) : (
                  "Continue →"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══════ STEP 3 ═══════ */}
        {step === 3 && !syncStarted && (
          <div style={card}>
            <StepIndicator step={3} total={3} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: "0 0 6px" }}>
              Sync your first reviews
            </h2>
            <p style={{ fontSize: 13, color: MUTED, margin: "0 0 24px", lineHeight: 1.5 }}>
              We'll pull your existing reviews from {platformsForSync.length} platform
              {platformsForSync.length !== 1 ? "s" : ""}. This usually takes 1–3 minutes.
            </p>

            {/* Platform list preview */}
            <div style={{ marginBottom: 24 }}>
              {platformsForSync.map((p) => (
                <div
                  key={p.platform}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: `1px solid ${BORDER}`,
                    fontSize: 13,
                    color: TEXT,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2a2a2a", flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{p.label}</span>
                  <span style={{ fontSize: 11, color: "#444444" }}>Ready</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setSyncStarted(true)}
                style={{ ...primaryBtn, flex: 1, height: 48 }}
              >
                Sync all reviews now
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                style={{ ...ghostBtn, flexShrink: 0 }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 3 && syncStarted && savedHotelId && (
          <FirstSyncExperience
            hotelId={savedHotelId}
            platforms={platformsForSync}
            onComplete={handleSyncComplete}
          />
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes ob-spin { to { transform: rotate(360deg); } }`,
        }}
      />
    </div>
  );
}
