"use client";
// app/dispatcher/dashboard/page.tsx

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { StatusPill, Tag, Bar } from "@/components/dispatcher/ui";
import { RouteStatus } from "@/lib/dispatcher/types";

type Filter = "all" | "attention" | "delivered";

interface VehicleRow {
  id: string;
  typeLabel: string;
  refrigerated: boolean;
  weightCapKg: number;
  volumeCapM3: number;
  usedKg: number;
  usedM3: number;
  fuelQuotaPctLeft: number;
  routesToday: number;
}

interface OrderRow {
  id: string;
  orderCode: string;
  vehicleId: string | null;
  status: "pending" | "assigned" | "deferred" | "delivered";
  weightKg: number;
  volumeM3: number;
  outletLabel: string;
}

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [vehRes, ordRes] = await Promise.all([
        supabase.from("vehicles").select("*"),
        supabase.from("orders").select(`
            id,
            order_code,
            status,
            vehicle_id,
            weight_kg,
            volume_m3,
            outlets ( brand, district )
          `),
      ]);

      if (vehRes.error) console.error("Supabase vehicles fetch error:", vehRes.error);
      if (ordRes.error) console.error("Supabase orders fetch error:", ordRes.error);

      const loadedOrders: OrderRow[] = (ordRes.data ?? []).map((o: any) => {
        const outlet = Array.isArray(o.outlets) ? o.outlets[0] ?? {} : o.outlets ?? {};
        return {
          id: o.id,
          orderCode: o.order_code,
          vehicleId: o.vehicle_id,
          status: o.status,
          weightKg: Number(o.weight_kg) || 0,
          volumeM3: Number(o.volume_m3) || 0,
          outletLabel: `${outlet.brand ?? "Outlet"}${outlet.district ? " · " + outlet.district : ""}`,
        };
      });

      setOrders(loadedOrders);

      // Vehicles load එක DB හි static අගයට වඩා assigned orders වලින් dynamically ගණනය කිරීම
      setVehicles(
        (vehRes.data ?? []).map((v: any) => {
          const vId = v.vehicle_id || v.id;
          
          // Assign වූ orders එකතු කර බර සහ පරිමාව ගණනය කිරීම
          const assignedToVehicle = loadedOrders.filter(
            (o) => o.vehicleId === vId && o.status === "assigned"
          );

          const calcUsedKg = assignedToVehicle.reduce((acc, curr) => acc + curr.weightKg, 0);
          const calcUsedM3 = assignedToVehicle.reduce((acc, curr) => acc + curr.volumeM3, 0);

          return {
            id: vId,
            typeLabel: v.type || "Truck",
            refrigerated: v.temp === "reefer" || v.temp === "Chilled",
            weightCapKg: Number(v.weight_cap_kg) || 3000,
            volumeCapM3: Number(v.volume_cap_m3) || 14,
            usedKg: calcUsedKg > 0 ? calcUsedKg : (v.used_weight_kg || 0),
            usedM3: calcUsedM3 > 0 ? calcUsedM3 : (v.used_volume_m3 || 0),
            fuelQuotaPctLeft: v.fuel_percent ?? 100,
            routesToday: v.routes_today ?? (assignedToVehicle.length > 0 ? 1 : 0),
          };
        })
      );

      setLoading(false);
    }
    load();
  }, []);

  const counts = useMemo(() => {
    const c: Record<RouteStatus, number> = { onPlan: 0, deferred: 0, late: 0, delivered: 0 };
    orders.forEach((o) => {
      if (o.status === "assigned") c.onPlan += 1;
      else if (o.status === "deferred") c.deferred += 1;
      else if (o.status === "delivered") c.delivered += 1;
    });
    return c;
  }, [orders]);

  const routesByVehicle = useMemo(() => {
    const byVehicle = new Map<string, OrderRow[]>();
    orders
      .filter((o) => o.status === "assigned" && o.vehicleId)
      .forEach((o) => {
        const list = byVehicle.get(o.vehicleId!) ?? [];
        list.push(o);
        byVehicle.set(o.vehicleId!, list);
      });

    return Array.from(byVehicle.entries()).map(([vehicleId, vOrders]) => {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      return {
        vehicleId,
        vehicleType: vehicle?.typeLabel ?? "Vehicle",
        stopsCount: vOrders.length,
        nextStop: vOrders[0]?.outletLabel ?? "—",
        status: "onPlan" as RouteStatus,
      };
    });
  }, [orders, vehicles]);

  const deferredOrders = orders.filter((o) => o.status === "deferred");

  const visibleRows = routesByVehicle.filter((r) => {
    if (filter === "all") return true;
    if (filter === "attention") return false;
    return false;
  });

  if (loading) {
    return <div style={{ color: "var(--g600)", fontSize: 14 }}>Loading dispatch data…</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
        Today&rsquo;s dispatch
      </h1>
      <p style={{ color: "var(--g600)", marginBottom: 16 }}>Peliyagoda depot · Waypoint Fresh</p>

      {deferredOrders.length > 0 && (
        <div
          style={{
            background: "var(--yellow)",
            color: "var(--on-yellow)",
            border: "1px solid var(--on-yellow)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          <b>{deferredOrders.length} order(s) deferred</b> — a reason is required before close.{" "}
          <Link href="/dispatcher/plan" style={{ textDecoration: "underline", fontWeight: 700 }}>
            Review
          </Link>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <Kpi label="On plan" value={counts.onPlan} color="var(--blue-text)" />
        <Kpi label="Deferred" value={counts.deferred} />
        <Kpi label="Late" value={counts.late} color="var(--red-text)" />
        <Kpi label="Delivered" value={counts.delivered} color="var(--g700)" />
      </div>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Fleet status</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Vehicle", "Type", "Load", "Fuel quota", "Routes today"].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => {
                const wtPct = v.weightCapKg ? Math.min(100, Math.round((v.usedKg / v.weightCapKg) * 100)) : 0;
                const volPct = v.volumeCapM3 ? Math.min(100, Math.round((v.usedM3 / v.volumeCapM3) * 100)) : 0;
                return (
                  <tr key={v.id}>
                    <Td><b>{v.id}</b></Td>
                    <Td><Tag variant={v.refrigerated ? "chill" : undefined}>{v.typeLabel}</Tag></Td>
                    <Td><Bar pct={wtPct} /> {wtPct}% wt · {volPct}% vol</Td>
                    <Td><Bar pct={100 - v.fuelQuotaPctLeft} warnAbove={85} /> {100 - v.fuelQuotaPctLeft}% used</Td>
                    <Td>{v.routesToday} of 2</Td>
                  </tr>
                );
              })}
              {vehicles.length === 0 && (
                <tr><Td colSpan={5}>No vehicles found in Supabase.</Td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ marginTop: 0 }}>Today&rsquo;s routes</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {(["all", "attention", "delivered"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid var(--g300)",
                  background: filter === f ? "var(--ink)" : "var(--white)",
                  color: filter === f ? "var(--paper)" : "var(--g600)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {f === "all" ? "All" : f === "attention" ? "Needs attention" : "Delivered"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Vehicle", "Status", "Next stop", "Stops assigned", ""].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr><Td colSpan={5}>No assigned routes yet — allocate some orders first.</Td></tr>
              )}
              {visibleRows.map((r) => (
                <tr key={r.vehicleId}>
                  <Td><b>{r.vehicleId}</b><div style={{ fontSize: 13, color: "var(--g600)" }}>{r.vehicleType}</div></Td>
                  <Td><StatusPill status={r.status} /></Td>
                  <Td>{r.nextStop}</Td>
                  <Td>{r.stopsCount}</Td>
                  <Td>
                    <Link href={`/dispatcher/route/${r.vehicleId}`} style={{ fontSize: 13, textDecoration: "underline" }}>
                      Open
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`.card{background:var(--white);border:1px solid var(--g300);border-radius:12px;padding:16px;margin-bottom:16px}`}</style>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--g300)", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, color: "var(--g600)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", color }}>{value}</div>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", fontSize: 12, textTransform: "uppercase", color: "var(--g600)", padding: "8px 12px", borderBottom: "1px solid var(--g300)", whiteSpace: "nowrap" }}>{children}</th>;
}
function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} style={{ padding: "11px 12px", borderBottom: "1px solid var(--g200)", fontSize: 14, verticalAlign: "top" }}>{children}</td>;
}