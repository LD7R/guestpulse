"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import type { CSSProperties } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase";

const glassCard: CSSProperties = {
  background: "#141414",
  border: "1px solid #1e1e1e",
  borderRadius: "8px",
  width: "380px",
  maxWidth: "100%",
  padding: "40px",
};

const glassInput: CSSProperties = {
  width: "100%",
  background: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: "6px",
  padding: "10px 14px",
  color: "#f0f0f0",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtn: CSSProperties = {
  width: "100%",
  height: "48px",
  background: "#f0f0f0",
  border: "none",
  borderRadius: "6px",
  color: "#0d0d0d",
  fontWeight: 600,
  fontSize: "13px",
  cursor: "pointer",
};

export default function SignupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    startTransition(() => {
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <div
      style={{
        background: "#0d0d0d",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={glassCard}>
        <div
          style={{
            textAlign: "center",
            fontSize: "18px",
            fontWeight: 700,
            color: "#f0f0f0",
            letterSpacing: "-0.02em",
            marginBottom: "8px",
          }}
        >
          GuestPulse
        </div>
        <h1
          style={{
            textAlign: "center",
            fontSize: "22px",
            fontWeight: 700,
            color: "#f0f0f0",
            marginBottom: "8px",
            letterSpacing: "-0.5px",
          }}
        >
          Create account
        </h1>
        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "#888888",
            marginBottom: "36px",
          }}
        >
          Sign up with email and password.
        </p>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "13px",
                color: "#888888",
                marginBottom: "6px",
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={glassInput}
              onFocus={(e) => {
                e.target.style.borderColor = "#3a3a3a";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#2a2a2a";
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "13px",
                color: "#888888",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={glassInput}
              onFocus={(e) => {
                e.target.style.borderColor = "#3a3a3a";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#2a2a2a";
              }}
            />
          </div>

          {error ? (
            <p
              style={{
                fontSize: "13px",
                color: "#f87171",
                marginTop: "12px",
                marginBottom: "8px",
              }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            style={{
              ...primaryBtn,
              opacity: isPending ? 0.6 : 1,
              cursor: isPending ? "not-allowed" : "pointer",
              marginTop: error ? "8px" : "0",
            }}
            onMouseEnter={(e) => {
              if (!isPending) {
                e.currentTarget.style.background = "#e0e0e0";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f0f0f0";
            }}
          >
            {isPending ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "14px",
            color: "#888888",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "#888888", fontWeight: 500, textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f0f0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#888888"; }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
