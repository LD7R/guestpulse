"use client";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By accessing or using GuestPulse, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.`,
  },
  {
    title: "2. Service Description",
    body: `GuestPulse provides:\n• Multi-platform review aggregation\n• AI-powered response drafting\n• Sentiment analysis\n• Competitor benchmarking\n• Brand voice training`,
  },
  {
    title: "3. Account Registration",
    body: `You must:\n• Provide accurate registration information\n• Maintain the confidentiality of your password\n• Be responsible for all activity under your account\n• Notify us of any unauthorized access\n• Be at least 18 years old`,
  },
  {
    title: "4. Subscription and Billing",
    body: `• Plans: Essential ($99/mo), Professional ($199/mo), Multi-property ($399/mo)\n• Free trial: 7 days, no credit card required\n• Billing cycle: monthly or annual (17% discount on annual)\n• Auto-renewal: subscriptions auto-renew unless cancelled\n• Cancellation: cancel anytime from Settings → Billing\n• Refunds: pro-rata refunds for annual plans within the first 30 days`,
  },
  {
    title: "5. Acceptable Use",
    body: `You agree NOT to:\n• Use the service for illegal purposes\n• Reverse engineer or attempt to access source code\n• Resell or sublicense access to the platform\n• Submit false reviews or manipulate ratings\n• Scrape data beyond your hotel's listings\n• Use the service to harass or defame others`,
  },
  {
    title: "6. AI-Generated Content",
    body: `• AI responses are suggestions; you are responsible for content posted publicly\n• We do not guarantee AI accuracy or appropriateness\n• Always review AI drafts before posting\n• You retain ownership of your customizations and brand voice training data`,
  },
  {
    title: "7. Third-Party Platforms",
    body: `GuestPulse integrates with TripAdvisor, Google Maps, Booking.com, Trip.com, Expedia, and Yelp. We are not affiliated with these platforms. Service availability depends on third-party API access which may change without notice.`,
  },
  {
    title: "8. Intellectual Property",
    body: `• GuestPulse and its features remain our property\n• You retain rights to your hotel data and content\n• We may use anonymized, aggregated data for product improvement and benchmarking`,
  },
  {
    title: "9. Service Availability",
    body: `• We aim for 99.5% uptime\n• Scheduled maintenance announced 48 hours in advance\n• We are not liable for downtime caused by third-party service outages`,
  },
  {
    title: "10. Limitation of Liability",
    body: `To the maximum extent permitted by law:\n• Service provided "as is" without warranties\n• We are not liable for indirect, incidental, or consequential damages\n• Our total liability is limited to fees paid in the past 12 months`,
  },
  {
    title: "11. Indemnification",
    body: `You agree to indemnify GuestPulse from claims arising from:\n• Your use of the service\n• Your violation of these terms\n• Content you post via the platform`,
  },
  {
    title: "12. Termination",
    body: `We may suspend or terminate your account for:\n• Breach of these terms\n• Non-payment after 14 days\n• Fraudulent activity\n• Court order or legal requirement`,
  },
  {
    title: "13. Governing Law",
    body: `These terms are governed by Dutch law. Disputes will be resolved through binding arbitration in Amsterdam, Netherlands, unless applicable law requires otherwise.`,
  },
  {
    title: "14. Changes to Terms",
    body: `We may update these terms. Material changes will be notified via email or in-app notice 30 days before taking effect. Continued use after notice constitutes acceptance.`,
  },
  {
    title: "15. Contact",
    body: `For questions about these terms:\nEmail: hello@guestpulse.app`,
  },
];

function renderBody(text: string) {
  return text.split("\n").map((line, i) => (
    <p key={i} style={{ fontSize: 15, color: "#d1d5db", lineHeight: 1.7, margin: "0 0 6px 0" }}>
      {line}
    </p>
  ));
}

export default function TermsPage() {
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
        Terms of Service
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
