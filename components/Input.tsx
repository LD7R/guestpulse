"use client";

import { forwardRef, type InputHTMLAttributes, type CSSProperties } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  containerStyle?: CSSProperties;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, containerStyle, id, style, ...rest }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const wrapperStyle: CSSProperties = {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      ...containerStyle,
    };

    const fieldRowStyle: CSSProperties = {
      display: "flex",
      alignItems: "center",
      background: "var(--bg-secondary)",
      border: `1px solid ${error ? "var(--accent-red)" : "var(--border)"}`,
      borderRadius: 6,
      overflow: "hidden",
      transition: "border-color 0.15s ease-out, box-shadow 0.15s ease-out",
    };

    const affixStyle: CSSProperties = {
      padding: "0 10px",
      fontSize: 13,
      color: "var(--text-muted)",
      background: "var(--bg-card)",
      borderRight: prefix ? "1px solid var(--border)" : undefined,
      borderLeft: suffix ? "1px solid var(--border)" : undefined,
      height: "100%",
      display: "flex",
      alignItems: "center",
      userSelect: "none",
      whiteSpace: "nowrap",
    };

    const inputStyle: CSSProperties = {
      flex: 1,
      background: "transparent",
      border: "none",
      outline: "none",
      padding: "9px 12px",
      fontSize: 13,
      color: "var(--text-primary)",
      fontFamily: "inherit",
      minWidth: 0,
      ...style,
    };

    return (
      <div style={wrapperStyle}>
        {label && (
          <label
            htmlFor={inputId}
            style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}
          >
            {label}
          </label>
        )}
        <div
          style={fieldRowStyle}
          onFocus={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = error ? "var(--accent-red)" : "var(--focus-ring)";
            el.style.boxShadow = error
              ? "0 0 0 2px rgba(248,113,113,0.15)"
              : "0 0 0 2px rgba(74,74,74,0.2)";
          }}
          onBlur={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = error ? "var(--accent-red)" : "var(--border)";
            el.style.boxShadow = "none";
          }}
        >
          {prefix && <span style={affixStyle}>{prefix}</span>}
          <input ref={ref} id={inputId} style={inputStyle} {...rest} />
          {suffix && (
            <span style={{ ...affixStyle, borderRight: undefined, borderLeft: "1px solid var(--border)" }}>
              {suffix}
            </span>
          )}
        </div>
        {error && (
          <span style={{ fontSize: 11, color: "var(--accent-red)", lineHeight: 1.4 }}>{error}</span>
        )}
        {!error && hint && (
          <span style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{hint}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
