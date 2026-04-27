"use client";

const SECTIONS = [
  {
    title: "1. Introduction",
    body: `GuestPulse ("we", "us", "our") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and protect information when you use our review management platform.`,
  },
  {
    title: "2. Information We Collect",
    body: `We collect:\n• Account information: name, email, hotel name and address\n• Hotel data: review platform URLs, hotel details, competitors you track\n• Review data: public reviews from third-party platforms (TripAdvisor, Google Maps, Booking.com, Trip.com, Expedia, Yelp)\n• Usage data: how you interact with our platform\n• Payment information: processed securely by Stripe; we do not store credit card details`,
  },
  {
    title: "3. How We Use Your Information",
    body: `We use your data to:\n• Provide and improve the GuestPulse service\n• Generate AI-powered review responses and insights\n• Send you account, billing and product communications\n• Detect fraud and ensure platform security\n• Comply with legal obligations`,
  },
  {
    title: "4. Data Sharing",
    body: `We do not sell your data. We share information only with:\n• Service providers (Supabase for hosting, Stripe for payments, Anthropic for AI processing, Apify for review collection)\n• Legal authorities when required by law\n• Business successors in case of merger or acquisition`,
  },
  {
    title: "5. AI and Data Training",
    body: `Your hotel data, reviews, and brand voice training materials are never used to train AI models. All AI processing is conducted via Anthropic's API with zero data retention. AI-generated responses are suggestions only and are not stored beyond your active session.`,
  },
  {
    title: "6. Data Security",
    body: `We implement industry-standard security measures including:\n• Encryption at rest and in transit\n• Row-level security on all database access\n• Regular security audits\n• Limited employee access on a need-to-know basis`,
  },
  {
    title: "7. Your Rights (GDPR + CCPA)",
    body: `You have the right to:\n• Access your personal data\n• Correct inaccurate data\n• Delete your data ("right to be forgotten")\n• Export your data\n• Opt out of marketing emails\n• Withdraw consent at any time\n\nTo exercise these rights, contact us at hello@guestpulse.app.`,
  },
  {
    title: "8. Data Retention",
    body: `We retain your data for as long as your account is active. After account deletion:\n• Personal data is deleted within 30 days\n• Anonymized usage data may be retained for analytics\n• Legal records (invoices, tax data) are retained as required by law`,
  },
  {
    title: "9. Cookies",
    body: `We use essential cookies for authentication and session management only. We do not use tracking cookies or third-party advertising cookies.`,
  },
  {
    title: "10. International Transfers",
    body: `Your data may be processed in countries outside your home country. We ensure adequate protection through standard contractual clauses and data processing agreements with all service providers.`,
  },
  {
    title: "11. Children",
    body: `GuestPulse is not intended for users under 18. We do not knowingly collect data from children.`,
  },
  {
    title: "12. Changes to This Policy",
    body: `We may update this policy from time to time. Material changes will be communicated via email or in-app notification with reasonable advance notice.`,
  },
  {
    title: "13. Contact",
    body: `For privacy questions or to exercise your rights:\nEmail: hello@guestpulse.app\nWe aim to respond within 2 business days.`,
  },
];

function renderBody(text: string) {
  return text.split("\n").map((line, i) => (
    <p key={i} style={{ fontSize: 15, color: "#d1d5db", lineHeight: 1.7, margin: "0 0 6px 0" }}>
      {line}
    </p>
  ));
}

export default function PrivacyPage() {
  return (
    <main
      style={{
        background: "#0f1117",
        fontFamily: "Inter, -apple-system, sans-serif",
        padding: "80px 32px",
        maxWidth: 760,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ fontSize: 36, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.8px", marginBottom: 8 }}>
        Privacy Policy
      </h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 56 }}>Last updated: April 2026</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#9ca3af",
                marginBottom: 12,
              }}
            >
              {s.title}
            </h2>
            <div>{renderBody(s.body)}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
