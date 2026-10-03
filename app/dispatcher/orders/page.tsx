//app/dispatcher/orders/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Tag } from "@/components/dispatcher/ui";

interface OrderItem {
  id: string;
  orderCode: string;
  outletId: string;
  outletName: string;
  vanOnly: boolean;
  tempClass: "Chilled" | "Ambient";
  weightKg: number;
  volumeM3: number;
  window: string;
  pastCutoff: boolean;
  status: string;
  deferReason: string;
}

const TABS = ["All", "Chilled", "Ambient", "Deferred", "Past cutoff"] as const;
const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();
const hhmm = (t?: string | null) => (t ? String(t).slice(0, 5) : "");

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("All");

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);

      // "*" keeps this working whether or not optional columns (created_at, order_date, defer_reason) exist.
      const [ordRes, assignedRes] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "*, outlets ( outlet_id, brand, district, parking_constraint, mall_window, window_open_time, window_close_time )"
          ),
        supabase.from("assigned_orders").select("order_id, status"),
      ]);

      if (ordRes.error) {
        setError(ordRes.error.message);
        setLoading(false);
        return;
      }

      const assignedMap = new Map<string, string>();
      (assignedRes.data ?? []).forEach((a: any) => {
        if (a.order_id) assignedMap.set(String(a.order_id), a.status || "assigned");
      });

      const loaded: OrderItem[] = (ordRes.data ?? []).map((o: any) => {
        const outlet = Array.isArray(o.outlets) ? o.outlets[0] ?? {} : o.outlets ?? {};

        // Orders for the next day close at 4 PM (Sri Lanka time) on the day before.
        let pastCutoff = false;
        if (o.order_date && o.created_at) {
          const cutoff = new Date(`${o.order_date}T16:00:00+05:30`).getTime() - 24 * 3600 * 1000;
          pastCutoff = new Date(o.created_at).getTime() > cutoff;
        }

        return {
          id: String(o.id),
          orderCode: o.order_code || String(o.id),
          outletId: outlet.outlet_id ? `[${outlet.outlet_id}]` : "",
          outletName: `${outlet.brand ?? "Outlet"}${outlet.district ? " · " + outlet.district : ""}`,
          vanOnly: norm(outlet.parking_constraint) === "van_only",
          tempClass: norm(o.temp_class ?? o.temp_requirement) === "chilled" ? "Chilled" : "Ambient",
          weightKg: Number(o.weight_kg) || 0,
          volumeM3: Number(o.volume_m3) || 0,
          window:
            outlet.mall_window ||
            (outlet.window_open_time ? `${hhmm(outlet.window_open_time)}–${hhmm(outlet.window_close_time)}` : "—"),
          pastCutoff,
          status: assignedMap.get(String(o.id)) ?? o.status,
          deferReason: o.defer_reason ?? "",
        };
      });

      setOrders(loaded);
      setLoading(false);
    }

    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "Chilled") return o.tempClass === "Chilled";
    if (activeTab === "Ambient") return o.tempClass === "Ambient";
    if (activeTab === "Deferred") return o.status === "deferred";
    if (activeTab === "Past cutoff") return o.pastCutoff;
    return true;
  });

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 24px", color: "var(--ink, #111827)" }}>
        Order queue
      </h1>

      <div className="tabs" role="tablist" style={{ marginBottom: 20 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`chip ${tab === "Chilled" ? "c" : tab === "Past cutoff" || tab === "Deferred" ? "w" : ""} ${
              activeTab === tab ? "on" : ""
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" style={{ color: "var(--red-text, #b91c1c)", fontSize: 14 }}>
          Could not load orders: {error}
        </p>
      )}

      <div style={{ background: "var(--white, #fff)", border: "1px solid var(--g300, #e5e7eb)", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Order", "Outlet", "Class", "Weight / volume", "Window", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{ textAlign: "left", fontSize: 12, textTransform: "uppercase", color: "var(--g600, #4b5563)", padding: "12px 16px", borderBottom: "1px solid var(--g300, #e5e7eb)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ ...cell, textAlign: "center", color: "var(--g600)" }}>Loading order queue…</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...cell, textAlign: "center", color: "var(--g600)" }}>No orders found.</td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} style={o.pastCutoff ? { background: "var(--yellow-tint, #fefce8)" } : undefined}>
                    <td style={cell}><b>{o.orderCode}</b></td>
                    <td style={cell}>
                      {o.outletId} {o.outletName} {o.vanOnly && <Tag>Van only</Tag>}
                    </td>
                    <td style={cell}>
                      <Tag variant={o.tempClass !== "Ambient" ? "chill" : undefined}>{o.tempClass}</Tag>
                    </td>
                    <td style={cell}>{o.weightKg} kg · {o.volumeM3} m³</td>
                    <td style={cell}>{o.pastCutoff ? "Past cutoff" : o.window}</td>
                    <td style={cell}>
                      {o.status === "assigned" && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green, #16a34a)" }}>Assigned</span>
                      )}
                      {o.status === "deferred" && (
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red-text, #b91c1c)" }}>Deferred</span>
                          {o.deferReason && (
                            <div style={{ fontSize: 12, color: "var(--g600)", marginTop: 2, maxWidth: 260 }}>{o.deferReason}</div>
                          )}
                        </div>
                      )}
                      {o.status !== "assigned" && !o.pastCutoff && (
                        <Link
                          href={`/dispatcher/plan?order=${encodeURIComponent(o.orderCode)}`}
                          style={{ display: "inline-block", marginTop: o.status === "deferred" ? 6 : 0, fontSize: 13, border: "1px solid var(--g300, #e5e7eb)", borderRadius: 6, padding: "2px 8px", textDecoration: "none", color: "inherit", fontWeight: 600 }}
                        >
                          Allocate
                        </Link>
                      )}
                      <div style={{ marginTop: 4 }}>
                        <Link href={`/dispatcher/decision-trail/${encodeURIComponent(o.orderCode)}`} style={{ fontSize: 12, color: "var(--g600)", textDecoration: "underline" }}>
                          Decision trail
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .tabs { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .chip { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; background: var(--g100, #f3f4f6); color: var(--g700, #374151); border: 1px solid var(--g300, #e5e7eb); cursor: pointer; font-family: inherit; }
        .chip.c { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
        .chip.w { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
        .chip.on { outline: 2px solid var(--ink, #111827); }
        .chip:focus-visible { outline: 2px solid var(--ink, #111827); outline-offset: 2px; }
      `}</style>
    </div>
  );
}

const cell: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--g200, #f3f4f6)",
  fontSize: 14,
  verticalAlign: "middle",
};