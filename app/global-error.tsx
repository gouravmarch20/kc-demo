"use client";

// Custom global-error so Next.js doesn't try to prerender the internal one,
// which fails in this app because the root layout pulls in redux-persist's
// PersistGate (React 19 + Turbopack + PersistGate crashes during prerender
// with "Cannot read properties of null (reading 'useContext')").
//
// Per next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md,
// global-error must be a Client Component and own its <html>/<body>. Avoid
// importing anything that depends on the Redux store here.

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#f8fafc",
          padding: "2rem",
        }}
      >
        <title>Something went wrong</title>
        <main
          style={{
            maxWidth: 480,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, opacity: 0.8 }}>
            An unexpected error occurred. You can try again, or reload the page.
          </p>
          {error?.digest ? (
            <code
              style={{
                fontSize: "0.75rem",
                opacity: 0.6,
                wordBreak: "break-all",
              }}
            >
              {error.digest}
            </code>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              alignSelf: "center",
              padding: "0.6rem 1.2rem",
              borderRadius: 8,
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#f8fafc",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
