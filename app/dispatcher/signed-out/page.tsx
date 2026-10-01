// app/dispatcher/signed-out/page.tsx
import Link from "next/link";

export default function SignedOutPage() {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: "40px auto",
        textAlign: "center",
        background: "var(--white)",
        border: "1px solid var(--g300)",
        borderRadius: 12,
        padding: 24,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          margin: "0 auto 12px",
          background: "var(--yellow)",
          border: "2px solid var(--on-yellow)",
          color: "var(--on-yellow)",
          borderRadius: 8,
          display: "grid",
          placeItems: "center",
          fontWeight: 900,
        }}
      >
        W
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 8px" }}>You&rsquo;re signed out</h1>
      <p style={{ color: "var(--g600)", margin: "0 0 16px" }}>
        Unsaved deferral drafts are kept on this device.
      </p>
      <Link
        href="/dispatcher/dashboard"
        style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: 44,
          padding: "0 16px",
          borderRadius: 8,
          border: "1px solid var(--ink)",
          background: "var(--ink)",
          color: "var(--paper)",
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Sign back in
      </Link>
    </div>
  );
}
