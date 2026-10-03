"use client";
// app/dispatcher/route/[vehicleId]/page.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { StatusPill, Tag, Bar } from "@/components/dispatcher/ui";
import { loadCtx } from "@/lib/dispatcher/loadCtx";
import {
  simulate, vehicleSummary, toMin, fmt, BUDGET,
  type Brand, type Ctx, type Order, type Trip, type Vehicle,
} from "@/lib/dispatcher/allocation";

interface Stop {
  order: Order;
  orderCode: string;
  outletName: string;
  district: string;
  status: string;
  tripId: number;
  seq: number;
  eta: string;
  window: string;
}

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();
const hhmm = (t?: string | null) => (t ? String(t).slice(0, 5) : "");
const pct = (n: number, d: number) => (d > 0 ? Math.min(100, Math.round((n / d) * 100)) : 0);

export default function VehicleRoutePage() {
  const params = useParams();
  // Works whether the folder is [vehicleId] or [vehicleid].
  const vehicleId = String((params as any)?.vehicleId ?? (params as any)?.vehicleid ?? "");

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driver, setDriver] = useState({ name: "Unassigned", phone: "" });
  const [stops, setStops] = useState<Stop[]>([]);
  const [ctx, setCtx] = useState<Ctx>({ travel: {}, allowance: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vehicleId) return;
    async function fetchRouteData() {
      setLoading(true);
      try {
        const [vehRes, asgRes, c] = await Promise.all([
          supabase.from("vehicles").select("*").eq("vehicle_id", vehicleId).maybeSingle(),
          supabase.from("assigned_orders").select("*").eq("vehicle_id", vehicleId).order("trip_id").order("stop_sequence"),
          loadCtx(),
        ]);
        if (vehRes.error) throw new Error(vehRes.error.message);
        if (asgRes.error) throw new Error(asgRes.error.message);
        setCtx(c);

        const v = vehRes.data;
        if (v) {
          setVehicle({
            id: String(v.vehicle_id),
            type: norm(v.type) === "van" ? "van" : "truck",
            reefer: norm(v.temp) === "reefer",
            kg: Number(v.weight_cap_kg),
            m3: Number(v.volume_cap_m3),
            kmPerL: Number(v.km_per_l) || 1,
            quotaL: Number(v.weekly_fuel_quota_l),
            usedL: Number(v.fuel_used_l) || 0,
            depot: v.depot,
          });
          setDriver({ name: v.driver_name || "Unassigned", phone: v.driver_phone || "" });
        }

        const assigned = asgRes.data ?? [];
        const ids = assigned.map((a: any) => String(a.order_id));
        if (ids.length === 0) {
          setStops([]);
          return;
        }
        const ordRes = await supabase
          .from("orders")
          .select("*, outlets ( outlet_id, brand, district, depot, dock_type, mall_window, window_open_time, window_close_time )")
          .in("id", ids);
        if (ordRes.error) throw new Error(ordRes.error.message);

        const byId = new Map((ordRes.data ?? []).map((o: any) => [String(o.id), o]));
        const built: Stop[] = assigned.flatMap((a: any) => {
          const o: any = byId.get(String(a.order_id));
          if (!o) return [];
          const out = Array.isArray(o.outlets) ? o.outlets[0] ?? {} : o.outlets ?? {};
          const order: Order = {
            id: o.order_code || String(o.id), dbId: String(o.id), outletId: String(out.outlet_id ?? ""),
            brand: out.brand as Brand, district: out.district, depot: out.depot, dock: out.dock_type,
            vanOnly: false, mallWindow: out.mall_window || null,
            open: toMin(out.window_open_time), close: toMin(out.window_close_time),
            chilled: norm(o.temp_class) === "chilled", kg: Number(o.weight_kg) || 0, m3: Number(o.volume_m3) || 0,
            deferredYesterday: 0, daysSinceServed: 0, label: "",
          };
          return [{
            order, orderCode: order.id, outletName: out.brand ?? "Outlet", district: out.district ?? "",
            status: a.status || "assigned", tripId: Number(a.trip_id) || 1, seq: Number(a.stop_sequence) || 0,
            eta: a.eta_time ? hhmm(a.eta_time) : "",
            window: out.mall_window || (out.window_open_time ? `${hhmm(out.window_open_time)}–${hhmm(out.window_close_time)}` : "—"),
          }];
        });
        setStops(built);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Could not load route.");
      } finally {
        setLoading(false);
      }
    }
    fetchRouteData();
  }, [vehicleId]);

  if (loading) return <div style={{ padding: "20px 0", color: "var(--g600)", fontSize: 14 }}>Loading route details for vehicle {vehicleId}…</div>;
  if (error) return <p role="alert" style={{ color: "var(--red-text)" }}>Could not load route: {error}</p>;
  if (!vehicle) return <p style={{ color: "var(--g600)" }}>Vehicle {vehicleId} was not found.</p>;

  // Capacity and time are per trip; fuel and time budgets are per vehicle.
  const trips: Trip[] = [1, 2].flatMap((n) => {
    const s = stops.filter((x) => x.tripId === n).sort((a, b) => a.seq - b.seq);
    return s.length ? [{ vehicleId, tripId: n as 1 | 2, brand: s[0].order.brand, district: s[0].order.district, orders: s.map((x) => x.order) }] : [];
  });
  const sum = vehicleSummary(vehicle, trips, ctx);
  const fuelPct = pct(sum.fuelL, vehicle.quotaL);

  const metric = (label: string, value: string, bar?: number, sub?: string) => (
    <div>
      <div style={{ fontSize: 12, color: "var(--g600)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{value}</div>
      {bar !== undefined && <Bar pct={bar} />}
      {sub && <div style={{ fontSize: 12, color: "var(--g600)", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/dispatcher/dashboard" style={{ fontSize: 13, textDecoration: "underline", color: "var(--g600)" }}>
          &larr; Back to dashboard
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>Route: {vehicleId}</h1>
          {vehicle.reefer && <Tag variant="chill">Refrigerated</Tag>}
        </div>
        <p style={{ color: "var(--g600)", margin: "4px 0 0" }}>
          {vehicle.type} &middot; {vehicle.depot} &middot; Driver: {driver.name}
          {driver.phone ? ` (${driver.phone})` : ""}
        </p>
      </div>

      <div style={{ background: "var(--white)", border: "1px solid var(--g300)", borderRadius: 12, padding: 16, marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        {metric("Trips", `${sum.trips} of 2`)}
        {metric("Fresh time", `${sum.freshMin} min`, pct(sum.freshMin, BUDGET.Fresh), `of ${BUDGET.Fresh} min budget`)}
        {metric("Style / Tech time", `${sum.otherMin} min`, pct(sum.otherMin, BUDGET.other), `of ${BUDGET.other} min budget`)}
        {metric("Weekly fuel", `${sum.fuelL.toFixed(0)} L`, fuelPct, `of ${vehicle.quotaL} L quota (${fuelPct}%)`)}
      </div>

      {trips.length === 0 && (
        <section className="card">
          <p style={{ margin: 0, color: "var(--g600)" }}>No orders currently assigned to vehicle {vehicleId}.</p>
        </section>
      )}

      {trips.map((t) => {
        const s = stops.filter((x) => x.tripId === t.tripId).sort((a, b) => a.seq - b.seq);
        const kg = s.reduce((a, c) => a + c.order.kg, 0);
        const m3 = s.reduce((a, c) => a + c.order.m3, 0);
        const sim = simulate(t, ctx);
        return (
          <section className="card" key={t.tripId}>
            <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 18 }}>
              Trip {t.tripId} &middot; {t.brand} &middot; {t.district}
            </h2>
            <p style={{ margin: "0 0 12px", color: "var(--g600)", fontSize: 13 }}>
              {sim ? `${sim.minutes} min planned` : "No travel data for this district"} &middot; {kg.toFixed(0)} of {vehicle.kg} kg &middot; {m3.toFixed(1)} of {vehicle.m3} m³
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
              <div><Bar pct={pct(kg, vehicle.kg)} /><div style={{ fontSize: 12, color: "var(--g600)", marginTop: 2 }}>{pct(kg, vehicle.kg)}% of weight cap</div></div>
              <div><Bar pct={pct(m3, vehicle.m3)} /><div style={{ fontSize: 12, color: "var(--g600)", marginTop: 2 }}>{pct(m3, vehicle.m3)}% of volume cap</div></div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Stop", "Order", "Outlet", "Window", "ETA", "Weight / volume", "Status"].map((h) => (
                      <th key={h} style={{ textAlign: "left", fontSize: 12, textTransform: "uppercase", color: "var(--g600)", padding: "8px 12px", borderBottom: "1px solid var(--g300)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.map((x, i) => (
                    <tr key={x.order.dbId}>
                      <td style={tdStyle}><b>{i + 1}</b></td>
                      <td style={tdStyle}><b>{x.orderCode}</b></td>
                      <td style={tdStyle}>
                        {x.outletName}
                        {x.district && <span style={{ color: "var(--g600)", fontSize: 13 }}> &middot; {x.district}</span>}
                      </td>
                      <td style={tdStyle}>{x.window}</td>
                      <td style={tdStyle}>{x.eta || (sim ? fmt(sim.arrivals[sim.orders.findIndex((o) => o.dbId === x.order.dbId)]) : "—")}</td>
                      <td style={tdStyle}>{x.order.kg} kg &middot; {x.order.m3} m³</td>
                      <td style={tdStyle}><StatusPill status={x.status === "delivered" ? "delivered" : "onPlan"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

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