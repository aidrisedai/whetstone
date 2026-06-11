"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#0d0d10", color: "#e8e4dc" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "1.5rem",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "3rem" }}>⚠️</span>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>
            Something went wrong
          </h2>
          <p style={{ color: "#888", maxWidth: "28rem", margin: 0, fontSize: "0.875rem" }}>
            {error.message || "A critical error occurred. Please refresh the page."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(245,149,89,0.4)",
              background: "rgba(245,149,89,0.1)",
              color: "#f59559",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
