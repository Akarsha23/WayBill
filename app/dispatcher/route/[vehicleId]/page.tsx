"use client";
// app/dispatcher/route/[vehicleId]/page.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { StatusPill, Tag, Bar } from "@/components/dispatcher/ui";

interface VehicleDetail {
  id: string;
  type: string;
  refrigerated: boolean;
  weightCapKg: number;
  volumeCapM3: number;
  fuelQuotaL: number;
  fuelUsedL: number;
  driverName?: string;
  driverPhone?: string;
}

interface AssignedStop {
  orderId: string;
  orderCode: string;
  outletName: string;
  district: string;
  weightKg: number;
  volumeM3: number;
  status: "assigned" | "delivered" | "deferred";
  timeWindow?: string;
}

export default function VehicleRoutePage() {
  const params = useParams();
  const vehicleId = params?.vehicleId as string;

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [stops, setStops] = useState<AssignedStop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vehicleId) return;

    async function fetchRouteData() {
      setLoading(true);

      // 1. Query vehicle using strictly 'vehicle_id' column
      const [vehRes, assignedRes] = await Promise.all([
        supabase
          .from("vehicles")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .maybeSingle(),
        supabase
          .from("assigned_orders")
          .select("*")
          .eq("vehicle_id", vehicleId),
      ]);

      if (vehRes.error) {
        console.error("Vehicles query error:", vehRes.error.message);
      } else if (vehRes.data) {
        const v = vehRes.data;
        setVehicle({
          id: String(v.vehicle_id),
          type: v.type || "Vehicle",
          refrigerated: v.temp === "reefer" || v.temp === "Chilled",
          weightCapKg: Number(v.weight_cap_kg) || 3000,
          volumeCapM3: Number(v.volume_cap_m3) || 14,
          fuelQuotaL: Number(v.fuel_quota_l || v.fuel_quota || v.max_fuel_l) || 100,
          fuelUsedL: Number(v.fuel_used_l || v.fuel_consumed_l) || 0,
          driverName: v.driver_name || "Unassigned",
          driverPhone: v.driver_phone || "",
        });
      }

      const assignedOrdersList = assignedRes.data ?? [];
      const orderIds = assignedOrdersList.map((a: any) => String(a.order_id));

      if (orderIds.length > 0) {
        // 2. Select valid columns from 'orders'
        const { data: ordersData, error: ordersErr } = await supabase
          .from("orders")
          .select(`
            id,
            order_code,
            weight_kg,
            volume_m3,
            outlets ( brand, district )
          `)
          .in("id", orderIds);

        if (ordersErr) {
          console.error("Orders query error:", ordersErr.message);
        }

        const assignedMap = new Map<string, string>();
        assignedOrdersList.forEach((a: any) => {
          assignedMap.set(String(a.order_id), a.status || "assigned");
        });

        const mappedStops: AssignedStop[] = (ordersData ?? []).map((o: any) => {
          const outlet = Array.isArray(o.outlets) ? o.outlets[0] ?? {} : o.outlets ?? {};
          return {
            orderId: String(o.id),
            orderCode: o.order_code || String(o.id),
            outletName: outlet.brand ?? "Outlet",
            district: outlet.district ?? "",
            weightKg: Number(o.weight_kg) || 0,
            volumeM3: Number(o.volume_m3) || 0,
            status: (assignedMap.get(String(o.id)) as any) || "assigned",
            timeWindow: o.window || "Standard",
          };
        });

        setStops(mappedStops);
      } else {
        setStops([]);
      }

      setLoading(false);
    }

    fetchRouteData();
  }, [vehicleId]);

  if (loading) {
    return (
      <div style={{ padding: "20px 0", color: "var(--g600)", fontSize: 14 }}>
        Loading route details for vehicle {vehicleId}…
      </div>
    );
  }

  const totalKg = stops.reduce((acc, curr) => acc + curr.weightKg, 0);
  const totalM3 = stops.reduce((acc, curr) => acc + curr.volumeM3, 0);
  const wtPct = vehicle?.weightCapKg ? Math.min(100, Math.round((totalKg / vehicle.weightCapKg) * 100)) : 0;
  const volPct = vehicle?.volumeCapM3 ? Math.min(100, Math.round((totalM3 / vehicle.volumeCapM3) * 100)) : 0;
  
  const fuelUsed = vehicle?.fuelUsedL || 0;
  const fuelQuota = vehicle?.fuelQuotaL || 100;
  const fuelPct = fuelQuota ? Math.min(100, Math.round((fuelUsed / fuelQuota) * 100)) : 0;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Navigation Header */}
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/dispatcher/dashboard"
          style={{ fontSize: 13, textDecoration: "underline", color: "var(--g600)" }}
        >
          &larr; Back to dashboard
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>
            Route: {vehicleId}
          </h1>
          {vehicle?.refrigerated && <Tag variant="chill">Refrigerated</Tag>}
        </div>
        <p style={{ color: "var(--g600)", margin: "4px 0 0" }}>
          Type: {vehicle?.type ?? "Vehicle"} &middot; Driver: {vehicle?.driverName}
          {vehicle?.driverPhone ? ` (${vehicle.driverPhone})` : ""}
        </p>
      </div>

      {/* Vehicle Capacity and Metrics Card */}
      <div
        style={{
          background: "var(--white)",
          border: "1px solid var(--g300)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--g600)", textTransform: "uppercase" }}>Total Weight</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{totalKg} kg</div>
          <Bar pct={wtPct} />
          <div style={{ fontSize: 12, color: "var(--g600)", marginTop: 2 }}>{wtPct}% of cap</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--g600)", textTransform: "uppercase" }}>Total Volume</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{totalM3} m³</div>
          <Bar pct={volPct} />
          <div style={{ fontSize: 12, color: "var(--g600)", marginTop: 2 }}>{volPct}% of cap</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--g600)", textTransform: "uppercase" }}>Fuel Quota</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{fuelQuota} L</div>
          <Bar pct={fuelPct} />
          <div style={{ fontSize: 12, color: "var(--g600)", marginTop: 2 }}>{fuelUsed} L used ({fuelPct}%)</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--g600)", textTransform: "uppercase" }}>Stops Assigned</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{stops.length}</div>
        </div>
      </div>

      {/* Stops Table */}
      <section className="card">
        <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Assigned Stops Sequence</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Order", "Outlet", "Window", "Weight / Volume", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontSize: 12,
                      textTransform: "uppercase",
                      color: "var(--g600)",
                      padding: "8px 12px",
                      borderBottom: "1px solid var(--g300)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stops.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "16px 12px", color: "var(--g600)" }}>
                    No orders currently assigned to vehicle {vehicleId}.
                  </td>
                </tr>
              ) : (
                stops.map((s, idx) => (
                  <tr key={s.orderId}>
                    <td style={tdStyle}><b>{idx + 1}</b></td>
                    <td style={tdStyle}><b>{s.orderCode}</b></td>
                    <td style={tdStyle}>
                      {s.outletName}
                      {s.district && <span style={{ color: "var(--g600)", fontSize: 13 }}> &middot; {s.district}</span>}
                    </td>
                    <td style={tdStyle}>{s.timeWindow}</td>
                    <td style={tdStyle}>{s.weightKg} kg &middot; {s.volumeM3} m³</td>
                    <td style={tdStyle}>
                      <StatusPill status={s.status === "delivered" ? "delivered" : "onPlan"} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`.card{background:var(--white);border:1px solid var(--g300);border-radius:12px;padding:16px;margin-bottom:16px}`}</style>
    </div>
  );
}

const tdStyle: React.CSSProperties = {
  padding: "11px 12px",
  borderBottom: "1px solid var(--g200)",
  fontSize: 14,
  verticalAlign: "top",
};