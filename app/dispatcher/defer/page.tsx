// app/dispatcher/defer/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { logEvents } from "@/lib/dispatcher/events";
import { DEFERRAL_REASONS } from "@/lib/dispatcher/types";
import { Button } from "@/components/dispatcher/ui";

interface Option {
  id: string; // orders.id
  code: string; // orders.order_code
  label: string;
}

export default function DeferOrderPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Option[]>([]);
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      // Assigned orders are already planned, so only unplanned ones can be deferred.
      const { data, error: err } = await supabase
        .from("orders")
        .select("id, order_code, status, outlets ( outlet_id, brand, district )")
        .in("status", ["pending", "deferred"]);

      if (err) {
        setError(`Could not load orders: ${err.message}`);
        setLoading(false);
        return;
      }

      const list: Option[] = (data ?? []).map((o: any) => {
        const out = Array.isArray(o.outlets) ? o.outlets[0] ?? {} : o.outlets ?? {};
        const where = [out.brand, out.district].filter(Boolean).join(" · ");
        return {
          id: String(o.id),
          code: o.order_code || String(o.id),
          label: `${o.order_code || o.id}${out.outlet_id ? ` · ${out.outlet_id}` : ""}${where ? ` (${where})` : ""}`,
        };
      });
      setOrders(list);

      // The plan page links here with ?order=ORD-xxxx.
      const wanted = new URLSearchParams(window.location.search).get("order");
      setOrderId(list.find((o) => o.code === wanted)?.id ?? list[0]?.id ?? "");
      setLoading(false);
    }
    fetchOrders();
  }, []);

  async function confirm() {
    const chosen = orders.find((o) => o.id === orderId);
    if (!reason || !chosen) return;
    setSubmitting(true);
    setError("");

    // One column holds the full explanation so the orders list and plan page show the same text.
    const defer_reason = note.trim() ? `${reason}: ${note.trim()}` : reason;
    const { error: err } = await supabase
      .from("orders")
      .update({ status: "deferred", defer_reason })
      .eq("id", orderId);

    if (err) {
      // Stay on the form: never show "logged" for a deferral that was not saved.
      setError(`The deferral was not saved: ${err.message}`);
      setSubmitting(false);
      return;
    }
    await logEvents([{ orderId: chosen.id, orderCode: chosen.code, action: "Deferred by dispatcher", detail: defer_reason }]);
    router.push(`/dispatcher/deferral-logged?order=${encodeURIComponent(chosen.code)}`);
  }

  return (
    <div>
      <div style={{ fontSize: 13, marginBottom: 10 }}>
        <Link href="/dispatcher/plan" style={{ textDecoration: "underline" }}>
          Plan
        </Link>{" "}
        / Defer
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>Defer an order</h1>
      <p style={{ color: "var(--g600)", marginBottom: 16, maxWidth: 640 }}>
        The order moves to the next run. A reason is required so the decision can be explained later.
      </p>

      <div style={{ background: "var(--white)", border: "1px solid var(--g300)", borderRadius: 12, padding: 16 }}>
        {loading ? (
          <div>Loading orders…</div>
        ) : orders.length === 0 ? (
          <p style={{ margin: 0 }}>There are no pending orders to defer.</p>
        ) : (
          <>
            <label style={labelStyle} htmlFor="order">Order</label>
            <select id="order" value={orderId} onChange={(e) => setOrderId(e.target.value)} style={inputStyle}>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>

            <label style={labelStyle} htmlFor="reason">Reason (required)</label>
            <select id="reason" value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle}>
              <option value="">Choose a reason</option>
              {DEFERRAL_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <label style={labelStyle} htmlFor="note">Note (optional)</label>
            <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />

            {error && (
              <p role="alert" style={{ color: "var(--red-text, #b91c1c)", fontSize: 14, marginBottom: 0 }}>{error}</p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <Button variant="yellow" disabled={!reason || submitting} onClick={confirm}>
                {submitting ? "Saving…" : "Confirm deferral"}
              </Button>
              <Link href="/dispatcher/plan" className="btn">Cancel</Link>
            </div>
          </>
        )}
        {!loading && orders.length === 0 && error && (
          <p role="alert" style={{ color: "var(--red-text, #b91c1c)", fontSize: 14 }}>{error}</p>
        )}
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