// app/dispatcher/deferral-logged/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function DeferralLoggedPage() {
  const params = useSearchParams();
  const order = params.get("order") ?? "—";
  const reason = params.get("reason") ?? "—";
  const note = params.get("note") ?? "None";
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
        Deferral logged
      </h1>
      <p style={{ color: "var(--g600)", marginBottom: 16 }}>
        The order moves to the next run and the store is notified.
      </p>

      <div style={{ background: "var(--white)", border: "1px solid var(--g300)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <Row label="Order" value={order} />
          <Row label="Reason" value={reason} />
          <Row label="Note" value={note} />
          <Row label="Recorded by" value={`Imesha Fernando · ${time}`} />
        </ul>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/dispatcher/dashboard" className="btn-primary">
          Back to dashboard
        </Link>
        <Link href={`/dispatcher/decision-trail/${order}`} className="btn">
          View decision trail
        </Link>
      </div>

      <style>{`
        .btn,.btn-primary{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:8px;font-weight:500;text-decoration:none}
        .btn{border:1px solid var(--g300);background:var(--white);color:var(--ink)}
        .btn-primary{border:1px solid var(--ink);background:var(--ink);color:var(--paper)}
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li style={{ padding: "8px 0", borderBottom: "1px solid var(--g200)", fontSize: 14 }}>
      <b>{label}</b> {value}
    </li>
  );
}
