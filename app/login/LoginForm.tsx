"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase";

import type { CSSProperties } from "react";

const glassCard: CSSProperties = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--card-radius)",
  boxShadow: "var(--glass-shadow), var(--glass-inner)",
  width: "420px",
  maxWidth: "100%",
  padding: "48px 40px",
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
  width: "100%",
  height: "48px",
  background: "var(--btn-primary-bg)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid var(--btn-primary-border)",
  borderRadius: "var(--btn-radius)",
  color: "var(--on-primary)",
  fontWeight: 500,
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const redirectTo = useMemo(() => {
    const value = searchParams.get("redirectTo");
    if (!value) return "/dashboard";
    return value.startsWith("/") ? value : "/dashboard";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    startTransition(() => {
      router.replace(redirectTo);
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
          background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
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
          background: "radial-gradient(circle, var(--platform-booking) 0%, transparent 70%)",
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
              background: "var(--accent)",
              boxShadow: "var(--accent-glow)",
            }}
          />
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--logo-text)",
              letterSpacing: "-0.03em",
            }}
          >
            GuestPulse
          </span>
        </div>
        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "var(--text-secondary)",
            marginBottom: "36px",
          }}
        >
          Sign in to your account
        </p>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "13px",
                color: "var(--text-secondary)",
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
                e.target.style.borderColor = "var(--focus-ring)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--glass-input-border)";
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={glassInput}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--focus-ring)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--glass-input-border)";
              }}
            />
          </div>

          {error ? (
            <p
              style={{
                fontSize: "13px",
                color: "var(--error)",
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
                e.currentTarget.style.background = "var(--btn-primary-hover)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--btn-primary-bg)";
            }}
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "14px",
            color: "var(--text-secondary)",
          }}
        >
          Don’t have an account?{" "}
          <Link
            href="/signup"
            style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
