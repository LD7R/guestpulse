import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "420px",
          maxWidth: "100%",
          height: "320px",
          borderRadius: "20px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.09)",
          animation: "pulse 1.2s ease-in-out infinite",
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.75} }`,
        }}
      />
    </div>
  );
}
