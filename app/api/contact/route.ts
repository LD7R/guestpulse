import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { name, email, hotel, message } = body as Record<string, string>;
  if (!name || !email || !message) {
    return NextResponse.json({ error: "name, email and message are required" }, { status: 400 });
  }

  // TODO: install resend (npm i resend) and set RESEND_API_KEY in .env.local
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'GuestPulse Contact <hello@guestpulse.com>',
  //   to: 'hello@guestpulse.com',
  //   subject: `Contact form: ${name} — ${hotel || 'no hotel'}`,
  //   text: `From: ${name} <${email}>\nHotel: ${hotel}\n\n${message}`,
  // })

  console.log("[contact form]", { name, email, hotel, message });

  return NextResponse.json({ success: true });
}
