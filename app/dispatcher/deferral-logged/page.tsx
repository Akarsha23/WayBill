// app/dispatcher/deferral-logged/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface Logged {
  code: string;
  status: string;
  reason: string;
  outlet: string;
  skippedBefore: boolean;
}

export default function DeferralLoggedPage() {
  const [logged, setLogged] = useState<Logged | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const code = new URLSearchParams(window.location.search).get("order");
      if (!code) {
        setError("No order was specified.");
        setLoading(false);
        return;
      }
      // Read the saved record, so this page stays correct after a refresh and proves the save worked.
      const { data, error: err } = await supabase
        .from("orders")
        .select("*, outlets ( outlet_id, brand, district )")
        .eq("order_code", code)
        .maybeSingle();

      if (err || !data) {
        setError(err?.message ?? `Order ${code} was not found.`);
      } else {
        const out = Array.isArray(data.outlets) ? data.outlets[0] ?? {} : data.outlets ?? {};
        setLogged({
          code,
          status: data.status,
          reason: data.defer_reason ?? "",
          outlet: [out.outlet_id, [out.brand, out.district].filter(Boolean).join(" · ")].filter(Boolean).join(" "),
          skippedBefore: Number(data.deferred_yesterday) > 0,
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  const saved = logged?.status === "deferred";

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
        {loading ? "Checking deferral…" : saved ? "Deferral logged" : "Deferral not found"}
      </h1>

      {error && (
        <p role="alert" style={{ color: "var(--red-text, #b91c1c)" }}>{error}</p>
      )}

      {logged && !saved && (
        <p role="alert" style={{ color: "var(--red-text, #b91c1c)" }}>
          {logged.code} is not marked as deferred (status: {logged.status}). Go back and try again.
        </p>
      )}

      {logged && saved && (
        <div style={{ background: "var(--white)", border: "1px solid var(--g300)", borderRadius: 12, padding: 16 }}>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "110px 1fr", gap: "8px 12px", fontSize: 14 }}>
            <dt style={{ color: "var(--g600)" }}>Order</dt>
            <dd style={{ margin: 0, fontWeight: 700 }}>{logged.code}</dd>
            <dt style={{ color: "var(--g600)" }}>Outlet</dt>
            <dd style={{ margin: 0 }}>{logged.outlet || "—"}</dd>
            <dt style={{ color: "var(--g600)" }}>Reason</dt>
            <dd style={{ margin: 0 }}>{logged.reason || "—"}</dd>
          </dl>
          <p style={{ color: "var(--g600)", fontSize: 13, margin: "14px 0 0" }}>
            The order moves to the next run and is shown with this reason in the order queue.
          </p>
          {logged.skippedBefore && (
            <p role="status" style={{ color: "var(--red-text, #b91c1c)", fontSize: 13, fontWeight: 700, margin: "10px 0 0" }}>
              This outlet was also skipped on the previous run. Give it priority next time.
            </p>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <Link href="/dispatcher/plan" className="btn primary">Back to plan</Link>
        <Link href="/dispatcher/orders" className="btn">View order queue</Link>
      </div>

      <style>{`
        .btn{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:8px;border:1px solid var(--g300);background:var(--white);color:var(--ink);text-decoration:none;font-weight:500}
        .btn.primary{background:var(--yellow);border-color:var(--on-yellow);color:var(--on-yellow)}
      `}</style>
    </div>
  );
}