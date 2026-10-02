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
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("All");

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);

      // Fetching only guaranteed columns from orders table
      const [ordRes, assignedRes] = await Promise.all([
        supabase.from("orders").select(`
          id,
          order_code,
          weight_kg,
          volume_m3,
          status,
          outlets ( brand, district )
        `),
        supabase.from("assigned_orders").select("order_id, status"),
      ]);

      if (ordRes.error) {
        console.error(
          "Supabase orders error:",
          ordRes.error.message,
          ordRes.error.details,
          ordRes.error.hint
        );
        setLoading(false);
        return;
      }

      // Map assigned_orders statuses
      const assignedMap = new Map<string, string>();
      (assignedRes.data ?? []).forEach((a: any) => {
        if (a.order_id) {
          assignedMap.set(String(a.order_id), a.status || "assigned");
        }
      });

      const loadedOrders: OrderItem[] = (ordRes.data ?? []).map((o: any) => {
        const outlet = Array.isArray(o.outlets) ? o.outlets[0] ?? {} : o.outlets ?? {};
        const isAssigned = assignedMap.has(String(o.id));

        return {
          id: String(o.id),
          orderCode: o.order_code || o.id,
          outletId: outlet.outlet_id ? `[${outlet.outlet_id}]` : "",
          outletName: `${outlet.brand ?? "Outlet"}${outlet.district ? " · " + outlet.district : ""}`,
          vanOnly: Boolean(o.van_only ?? false),
          // Fallback temperature class check (or update 'temp' if your DB column has a different name)
          tempClass: (o.temp || o.temp_class || o.temperature) === "reefer" ? "Chilled" : "Ambient",
          weightKg: Number(o.weight_kg) || 0,
          volumeM3: Number(o.volume_m3) || 0,
          window: o.time_window || "Standard",
          pastCutoff: Boolean(o.past_cutoff ?? false),
          status: isAssigned ? assignedMap.get(String(o.id))! : o.status,
        };
      });

      setOrders(loadedOrders);
      setLoading(false);
    }

    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "Chilled") return o.tempClass === "Chilled";
    if (activeTab === "Ambient") return o.tempClass === "Ambient";
    if (activeTab === "Past cutoff") return o.pastCutoff;
    return true;
  });

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 900,
          letterSpacing: "-0.03em",
          margin: "0 0 24px",
          color: "var(--ink, #111827)",
        }}
      >
        Order queue
      </h1>

      <div className="tabs" style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["All", "Chilled", "Ambient", "Past cutoff"] as const).map((tab) => (
          <span
            key={tab}
            className={`tag ${tab === "Chilled" ? "c" : tab === "Past cutoff" ? "w" : ""} ${
              activeTab === tab ? "on" : ""
            }`}
            onClick={() => setActiveTab(tab)}
            style={{ cursor: "pointer" }}
          >
            {tab}
          </span>
        ))}
      </div>

      <div
        style={{
          background: "var(--white, #ffffff)",
          border: "1px solid var(--g300, #e5e7eb)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Order", "Outlet", "Class", "Weight / volume", "Window", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontSize: 12,
                      textTransform: "uppercase",
                      color: "var(--g600, #4b5563)",
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--g300, #e5e7eb)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ ...cell, textAlign: "center", color: "var(--g600)" }}>
                    Loading order queue…
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...cell, textAlign: "center", color: "var(--g600)" }}>
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} style={o.pastCutoff ? { background: "var(--yellow-tint, #fefce8)" } : undefined}>
                    <td style={cell}>
                      <b>{o.orderCode}</b>
                    </td>
                    <td style={cell}>
                      {o.outletId} {o.outletName} {o.vanOnly && <Tag>Van only</Tag>}
                    </td>
                    <td style={cell}>
                      <Tag variant={o.tempClass !== "Ambient" ? "chill" : undefined}>{o.tempClass}</Tag>
                    </td>
                    <td style={cell}>
                      {o.weightKg} kg · {o.volumeM3} m³
                    </td>
                    <td style={cell}>{o.pastCutoff ? "Past cutoff" : o.window}</td>
                    <td style={cell}>
                      {!o.pastCutoff && o.status !== "assigned" && (
                        <Link
                          href="/dispatcher/plan"
                          style={{
                            fontSize: 13,
                            border: "1px solid var(--g300, #e5e7eb)",
                            borderRadius: 6,
                            padding: "2px 8px",
                            textDecoration: "none",
                            color: "inherit",
                            fontWeight: 600,
                          }}
                        >
                          Allocate
                        </Link>
                      )}
                      {o.status === "assigned" && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green, #16a34a)" }}>
                          Assigned
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .tabs { display: flex; gap: 6px; align-items: center; }
        .tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          background: var(--g100, #f3f4f6);
          color: var(--g700, #374151);
          border: 1px solid var(--g300, #e5e7eb);
          user-select: none;
        }
        .tag.c { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
        .tag.w { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
        .tag.on { outline: 2px solid var(--ink, #111827); }
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