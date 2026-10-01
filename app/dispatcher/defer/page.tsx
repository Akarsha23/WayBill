// app/dispatcher/defer/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ORDERS } from "@/lib/dispatcher/data";
import { DEFERRAL_REASONS } from "@/lib/dispatcher/types";
import { Button } from "@/components/dispatcher/ui";

export default function DeferOrderPage() {
  const router = useRouter();
  const deferable = ORDERS.filter((o) => !o.pastCutoff);
  const [orderId, setOrderId] = useState(deferable[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  function confirm() {
    if (!reason) return;
    // In production: POST /api/deferrals { orderId, reason, note }
    // Store the result (e.g. in a query param, context, or just refetch) —
    // this demo keeps it simple and passes it via the URL.
    const params = new URLSearchParams({ order: orderId, reason, note: note || "None" });
    router.push(`/dispatcher/deferral-logged?${params.toString()}`);
  }

  return (
    <div>
      <div style={{ fontSize: 13, marginBottom: 10 }}>
        <Link href="/dispatcher/allocate" style={{ textDecoration: "underline" }}>
          Allocate
        </Link>{" "}
        / Defer
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
        Defer an order
      </h1>
      <p style={{ color: "var(--g600)", marginBottom: 16, maxWidth: 640 }}>
        The order moves to the next run. A reason is required so the decision can be explained
        later.
      </p>

      <div style={{ background: "var(--white)", border: "1px solid var(--g300)", borderRadius: 12, padding: 16 }}>
        <label style={labelStyle} htmlFor="order">
          Order
        </label>
        <select id="order" value={orderId} onChange={(e) => setOrderId(e.target.value)} style={inputStyle}>
          {deferable.map((o) => (
            <option key={o.id} value={o.id}>
              {o.id} · {o.outletId} {o.outletName}
            </option>
          ))}
        </select>

        <label style={labelStyle} htmlFor="reason">
          Reason (required)
        </label>
        <select id="reason" value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle}>
          <option value="">Choose a reason</option>
          {DEFERRAL_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        <label style={labelStyle} htmlFor="note">
          Note (optional)
        </label>
        <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <Button variant="yellow" disabled={!reason} onClick={confirm}>
            Confirm deferral
          </Button>
          <Link href="/dispatcher/allocate" className="btn">
            Cancel
          </Link>
        </div>
      </div>

      <style>{`.btn{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:8px;border:1px solid var(--g300);background:var(--white);color:var(--ink);text-decoration:none;font-weight:500}`}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, margin: "14px 0 6px" };
const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "8px 10px",
  border: "1px solid var(--g400)",
  borderRadius: 8,
  background: "var(--white)",
  color: "var(--ink)",
};
