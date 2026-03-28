"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import type { CSSProperties } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase";

const glassCard: CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: "20px",
  boxShadow:
    "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  width: "420px",
  maxWidth: "100%",
  padding: "48px 40px",
};

const glassInput: CSSProperties = {
  width: "100%",
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "12px",
  padding: "12px 16px",
  color: "#ffffff",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtn: CSSProperties = {
  width: "100%",
  height: "48px",
  background: "rgba(99, 102, 241, 0.8)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(99, 102, 241, 0.4)",
  borderRadius: "12px",
  color: "#ffffff",
  fontWeight: 500,
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
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
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
          opacity: 0.15,
          top: "-100px",
          left: "-100px",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
          opacity: 0.1,
          bottom: "-80px",
          right: "-80px",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div style={glassCard}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#6366f1",
              boxShadow: "0 0 12px rgba(99, 102, 241, 0.8)",
            }}
          />
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.03em",
            }}
          >
            GuestPulse
          </span>
        </div>
        <h1
          style={{
            textAlign: "center",
            fontSize: "22px",
            fontWeight: 700,
            color: "#ffffff",
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
            color: "rgba(255, 255, 255, 0.4)",
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
                color: "rgba(255, 255, 255, 0.6)",
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
                e.target.style.borderColor = "rgba(99, 102, 241, 0.6)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.6)",
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
                e.target.style.borderColor = "rgba(99, 102, 241, 0.6)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            />
          </div>

          {error ? (
            <p
              style={{
                fontSize: "13px",
                color: "rgba(239, 68, 68, 0.95)",
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
                e.currentTarget.style.background = "rgba(99, 102, 241, 1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.8)";
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
            color: "rgba(255, 255, 255, 0.4)",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "rgba(99, 102, 241, 0.9)", fontWeight: 500, textDecoration: "none" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
