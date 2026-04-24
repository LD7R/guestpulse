"use client";

const SECTIONS = [
  {
    title: "What we collect",
    body: "We collect the information you provide when you sign up (name, email, hotel name), your hotel's review data from public listing pages, and basic usage analytics to improve the product. We do not collect your guests' personal data beyond what appears in public reviews.",
  },
  {
    title: "How we use it",
    body: "Your data is used solely to operate GuestPulse: syncing reviews, generating AI responses, and delivering analytics. We do not sell your data to third parties, use it for advertising, or share it with competitors.",
  },
  {
    title: "AI and your data",
    body: "Your review data and hotel information are never used to train AI models. AI responses are generated in real-time using your data as context and discarded immediately after.",
  },
  {
    title: "Data storage",
    body: "Your data is stored on enterprise-grade infrastructure in the EU. We use encryption at rest and in transit. Backups are retained for 30 days.",
  },
  {
    title: "Your rights",
    body: "You can export your data at any time from your account settings. You can request deletion of your account and all associated data by emailing hello@guestpulse.com. We comply with GDPR.",
  },
  {
    title: "Cookies",
    body: "We use only essential cookies required to operate the service (authentication session). We do not use advertising or tracking cookies.",
  },
  {
    title: "Contact",
    body: "For privacy questions, email hello@guestpulse.com. We aim to respond within 2 business days.",
  },
];

export default function PrivacyPage() {
  return (
    <main style={{ padding: "96px 48px", maxWidth: 760, margin: "0 auto", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 12, textAlign: "center" }}>Legal</p>
      <h1 style={{ fontSize: 40, fontWeight: 700, color: "#ffffff", letterSpacing: "-1px", textAlign: "center", marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 64 }}>Last updated: April 2026</p>
      <p style={{ fontSize: 15, color: "#9ca3af", lineHeight: 1.8, marginBottom: 48 }}>
        Your privacy matters to us. This policy explains what data GuestPulse collects, how we use it, and your rights as a user.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#ffffff", marginBottom: 10 }}>{s.title}</h2>
            <p style={{ fontSize: 15, color: "#9ca3af", lineHeight: 1.8 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
