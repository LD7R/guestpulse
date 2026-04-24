"use client";

const SECTIONS = [
  {
    title: "Acceptance of terms",
    body: "By accessing or using GuestPulse, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.",
  },
  {
    title: "Use of the service",
    body: "GuestPulse is a review management tool for hotel businesses. You may use the service only for lawful purposes related to managing your hotel's online reputation. You must not use the service to harass, defame, or misrepresent.",
  },
  {
    title: "Account responsibility",
    body: "You are responsible for maintaining the security of your account credentials. You are responsible for all activity under your account. Notify us immediately at hello@guestpulse.com if you suspect unauthorized access.",
  },
  {
    title: "Payment and billing",
    body: "Paid plans are billed monthly or annually in advance. All plans include a 7-day free trial. You may cancel at any time before the trial ends to avoid charges. Refunds are not provided for partial billing periods.",
  },
  {
    title: "Intellectual property",
    body: "GuestPulse and its content are owned by GuestPulse. You retain ownership of your hotel data. You grant us a limited license to use your data to operate the service.",
  },
  {
    title: "AI-generated content",
    body: "AI-generated response drafts are provided as suggestions only. You are responsible for reviewing, editing, and publishing any responses to guests. We do not guarantee the accuracy or appropriateness of AI suggestions.",
  },
  {
    title: "Limitation of liability",
    body: "GuestPulse is provided 'as is'. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability is limited to the amount you paid in the 12 months preceding the claim.",
  },
  {
    title: "Changes to terms",
    body: "We may update these terms with reasonable notice. Continued use after notice constitutes acceptance. Material changes will be emailed to active subscribers.",
  },
  {
    title: "Contact",
    body: "For terms questions, email hello@guestpulse.com.",
  },
];

export default function TermsPage() {
  return (
    <main style={{ padding: "96px 48px", maxWidth: 760, margin: "0 auto", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7280", marginBottom: 12, textAlign: "center" }}>Legal</p>
      <h1 style={{ fontSize: 40, fontWeight: 700, color: "#ffffff", letterSpacing: "-1px", textAlign: "center", marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 64 }}>Last updated: April 2026</p>
      <p style={{ fontSize: 15, color: "#9ca3af", lineHeight: 1.8, marginBottom: 48 }}>
        These Terms of Service govern your use of GuestPulse. Please read them carefully before using the service.
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
