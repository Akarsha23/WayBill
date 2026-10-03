"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { logEvents } from "@/lib/dispatcher/events";
import { Tag, Button } from "@/components/dispatcher/ui";
import {
  autoAllocate, evaluate, simulate, fmt, toMin, vehicleSummary, BUDGET,
  type Brand, type Ctx, type Order, type Trip, type Vehicle,
} from "@/lib/dispatcher/allocation";

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

export default function AllocatePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [ctx, setCtx] = useState<Ctx>({ travel: {}, allowance: {} });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [so, setSo] = useState<number | null>(null);
  const [sv, setSv] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deferred, setDeferred] = useState<{ order: Order; reason: string }[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [veh, ord, out, trv, alw, asg] = await Promise.all([
          supabase.from("vehicles").select("*"),
          supabase.from("orders").select("*").in("status", ["pending", "deferred", "assigned"]),
          supabase.from("outlets").select("*"),
          supabase.from("district_travel").select("*"),
          supabase.from("service_allowance").select("*"),
          supabase.from("assigned_orders").select("*").eq("status", "assigned"),
        ]);
        const err = [veh, ord, out, trv, alw, asg].find((r) => r.error);
        if (err?.error) throw new Error(err.error.message);

        const nextCtx: Ctx = { travel: {}, allowance: {} };
        trv.data?.forEach((r: any) => {
          nextCtx.travel[r.district] = {
            toDistrictMin: Number(r.depot_to_district_freeflow_min),
            toDistrictKm: Number(r.depot_to_district_km),
            interMin: Number(r.inter_stop_freeflow_min),
            interKm: Number(r.inter_stop_km),
          };
        });
        alw.data?.forEach((r: any) => {
          nextCtx.allowance[`${r.brand}|${r.dock_type}`] = Number(r.service_allowance_min);
        });
        setCtx(nextCtx);

        // Workshop vehicles can never be allocated.
        setVehicles(
          (veh.data ?? [])
            .filter((v: any) => norm(v.status) !== "in_workshop")
            .map((v: any): Vehicle => ({
              id: String(v.vehicle_id),
              type: norm(v.type) === "van" ? "van" : "truck",
              reefer: norm(v.temp) === "reefer",
              kg: Number(v.weight_cap_kg),
              m3: Number(v.volume_cap_m3),
              kmPerL: Number(v.km_per_l) || 1,
              quotaL: Number(v.weekly_fuel_quota_l),
              usedL: Number(v.fuel_used_l) || 0,
              depot: v.depot,
            }))
        );

        const outlets = new Map<string, any>((out.data ?? []).map((o: any) => [String(o.outlet_id), o]));
        const all: Order[] = [];
        const statusById = new Map<string, string>();
        // Orders with missing size/outlet data are skipped rather than given invented defaults.
        for (const r of ord.data ?? []) {
          const o = outlets.get(String(r.outlet_id));
          if (!o || !(Number(r.weight_kg) > 0) || !(Number(r.volume_m3) > 0)) continue;
          statusById.set(String(r.id), r.status);
          all.push({
            id: r.order_code ?? String(r.id),
            dbId: String(r.id),
            outletId: String(r.outlet_id),
            brand: o.brand as Brand,
            district: o.district,
            depot: o.depot,
            dock: o.dock_type,
            vanOnly: norm(o.parking_constraint) === "van_only",
            mallWindow: o.mall_window || null,
            open: toMin(o.window_open_time),
            close: toMin(o.window_close_time),
            chilled: norm(r.temp_class ?? r.temp_requirement) === "chilled",
            kg: Number(r.weight_kg),
            m3: Number(r.volume_m3),
            deferredYesterday: Number(r.deferred_yesterday) || (r.status === "deferred" ? 1 : 0),
            daysSinceServed: Number(r.days_since_last_served) || 0,
            label: `${o.brand} · ${o.district}`,
          });
        }
        // Deferred orders stay allocatable: they are exactly the ones that must be served next.
        const open = all.filter((o) => ["pending", "deferred"].includes(statusById.get(o.dbId) ?? ""));
        setOrders(open);
        const wanted = new URLSearchParams(window.location.search).get("order");
        const idx = wanted ? open.findIndex((o) => o.id === wanted) : -1;
        if (idx >= 0) setSo(idx);

        // Rebuild persisted trips so a reload keeps today's plan.
        const byId = new Map(all.map((o) => [o.dbId, o]));
        const grouped = new Map<string, Trip>();
        [...(asg.data ?? [])]
          .sort((a: any, b: any) => a.stop_sequence - b.stop_sequence)
          .forEach((a: any) => {
            const o = byId.get(String(a.order_id));
            if (!o) return;
            const key = `${a.vehicle_id}|${a.trip_id}`;
            const t = grouped.get(key) ?? {
              vehicleId: String(a.vehicle_id), tripId: (Number(a.trip_id) || 1) as 1 | 2,
              brand: o.brand, district: o.district, orders: [],
            };
            t.orders.push(o);
            grouped.set(key, t);
          });
        setTrips([...grouped.values()]);
      } catch (e: any) {
        console.error(e);
        setLoadError(e.message ?? "Could not load planning data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const selectedOrder = so !== null ? orders[so] ?? null : null;
  const selectedVehicle = sv !== null ? vehicles[sv] ?? null : null;
  const ev = useMemo(
    () => (selectedOrder && selectedVehicle ? evaluate(selectedOrder, selectedVehicle, trips, ctx) : null),
    [selectedOrder, selectedVehicle, trips, ctx]
  );

  /** Writes whole trips (stop order and ETA are recomputed when a trip changes). */
  async function persistTrips(changed: Trip[], eta: Record<string, string>) {
    const rows = changed.flatMap((t) =>
      t.orders.map((o, i) => ({
        order_id: o.dbId, vehicle_id: t.vehicleId, trip_id: t.tripId, stop_sequence: i + 1,
        eta_time: eta[o.id] ?? null, status: "assigned", assigned_at: new Date().toISOString(),
      }))
    );
    if (!rows.length) return;
    const up = await supabase.from("assigned_orders").upsert(rows, { onConflict: "order_id" });
    if (up.error) throw up.error;
    const ids = changed.flatMap((t) => t.orders.map((o) => o.dbId));
    const st = await supabase.from("orders").update({ status: "assigned", defer_reason: null }).in("id", ids);
    if (st.error) throw st.error;
  }

  async function handleAssign() {
    if (!ev?.ok || !ev.trip || !selectedOrder) return;
    setMessage("Saving assignment…");
    try {
      await persistTrips([ev.trip], ev.etaByOrder);
      const at = ev.trip.orders.findIndex((o) => o.dbId === selectedOrder.dbId) + 1;
      await logEvents([{ orderId: selectedOrder.dbId, orderCode: selectedOrder.id, action: `Allocated to ${ev.trip.vehicleId}, trip ${ev.trip.tripId}, stop ${at}`, detail: `ETA ${ev.etaByOrder[selectedOrder.id]}; all rule checks passed` }]);
      setTrips((ts) => (ev.existing ? ts.map((t) => (t === ev.existing ? ev.trip! : t)) : [...ts, ev.trip!]));
      setOrders((os) => os.filter((o) => o.dbId !== selectedOrder.dbId));
      const stop = ev.trip.orders.findIndex((o) => o.dbId === selectedOrder.dbId) + 1;
      setMessage(`${selectedOrder.id} assigned to ${ev.trip.vehicleId}, trip ${ev.trip.tripId}, stop ${stop} (ETA ${ev.etaByOrder[selectedOrder.id]}).`);
      setSo(null);
      setSv(null);
    } catch (e: any) {
      setMessage(`Could not save: ${e.message}`);
    }
  }

  async function handleAutoAllocate() {
    setBusy(true);
    setMessage("Allocating against capacity, windows, time budgets and fuel…");
    try {
      const res = autoAllocate(orders, vehicles, trips, ctx);
      const eta: Record<string, string> = {};
      // ETAs come from the final trips so every stop has an expected arrival time.
      res.changed.forEach((t) => {
        const s = simulate(t, ctx);
        s?.orders.forEach((o, i) => (eta[o.id] = fmt(s.arrivals[i])));
      });
      await persistTrips(res.changed, eta);

      // Every deferral stores its reason so it can be explained and shown to the store manager.
      const reasons = new Map<string, string[]>();
      res.deferred.forEach(({ order, reason }) => reasons.set(reason, [...(reasons.get(reason) ?? []), order.dbId]));
      for (const [reason, ids] of reasons) {
        const r = await supabase.from("orders").update({ status: "deferred", defer_reason: reason }).in("id", ids);
        if (r.error) throw r.error;
      }

      const where = new Map<string, Trip>();
      res.changed.forEach((t) => t.orders.forEach((o) => where.set(o.dbId, t)));
      await logEvents([
        ...res.assigned.map((o) => {
          const t = where.get(o.dbId)!;
          return { orderId: o.dbId, orderCode: o.id, action: `Auto-allocated to ${t.vehicleId}, trip ${t.tripId}, stop ${t.orders.findIndex((x) => x.dbId === o.dbId) + 1}`, detail: `ETA ${eta[o.id]}; all rule checks passed` };
        }),
        ...res.deferred.map(({ order, reason }) => ({ orderId: order.dbId, orderCode: order.id, action: "Deferred automatically", detail: reason })),
      ]);

      setTrips(res.trips);
      setOrders(res.deferred.map((d) => d.order));
      setDeferred(res.deferred);
      setSo(null);
      setSv(null);
      setMessage(`Assigned ${res.assigned.length} orders. ${res.deferred.length} deferred with reasons recorded.`);
    } catch (e: any) {
      setMessage(`Allocation failed, nothing was marked as deferred: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div style={{ color: "var(--g600)", fontSize: 14 }}>Loading orders and vehicles…</div>;
  if (loadError)
    return <p role="alert" style={{ color: "var(--red-text)" }}>Could not load planning data: {loadError}</p>;

  const card = (active: boolean): React.CSSProperties => ({
    display: "block", width: "100%", textAlign: "left", background: "var(--white)",
    border: active ? "2px solid var(--ink)" : "1px solid var(--g300)",
    borderRadius: 10, padding: 12, marginBottom: 8, cursor: "pointer",
  });

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>Allocate an order</h1>
      <p style={{ color: "var(--g600)", marginBottom: 16, maxWidth: 640 }}>
        Pick an order and a vehicle, or let the system plan every order at once. Each assignment is checked against
        depot, temperature, access, capacity, time budget, delivery windows and fuel quota before it is saved.
      </p>

      <div style={{ marginBottom: 20 }}>
        <Button variant="yellow" disabled={busy || orders.length === 0} onClick={handleAutoAllocate}>
          ⚡ {busy ? "Planning…" : "Run automatic allocation"}
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>1. Order</h2>
          {orders.length === 0 ? (
            <p style={{ color: "var(--g600)", fontSize: 14 }}>No pending orders.</p>
          ) : (
            [...orders].map((o, i) => (
              <button key={o.dbId} onClick={() => setSo(i)} style={card(so === i)}>
                <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.01em", color: "var(--ink)" }}>
                  {o.id}
                </div>
                <div style={{ marginTop: 4 }}>
                  <Tag variant={o.chilled ? "chill" : undefined}>{o.chilled ? "Chilled" : "Ambient"}</Tag>
                  {o.vanOnly && <Tag>Van only</Tag>}
                </div>
                <div style={{ color: "var(--g600)", fontSize: 13, marginTop: 4 }}>
                  {o.label} · {o.kg} kg · {o.m3} m³
                  {o.deferredYesterday ? " · skipped yesterday" : ""}
                </div>
              </button>
            ))
          )}
        </div>

        <div>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>2. Vehicle</h2>
          {vehicles.length === 0 ? (
            <p style={{ color: "var(--g600)", fontSize: 14 }}>No available vehicles.</p>
          ) : (
            vehicles.map((v, i) => {
              const s = vehicleSummary(v, trips, ctx);
              return (
                <button key={v.id} onClick={() => setSv(i)} style={card(sv === i)}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {v.id} · {v.type}{v.reefer ? " (reefer)" : ""} · {v.depot}
                  </div>
                  <div style={{ color: "var(--g600)", fontSize: 13, marginTop: 4 }}>
                    trips {s.trips}/2 · fresh {s.freshMin}/{BUDGET.Fresh} min · other {s.otherMin}/{BUDGET.other} min · fuel{" "}
                    {s.fuelL.toFixed(0)}/{v.quotaL} L
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div style={{ background: "var(--white)", border: "1px solid var(--g300)", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Manual rule check</h2>
        <div style={{ marginBottom: 14 }}>
          {!ev ? (
            <p style={{ color: "var(--g600)", fontSize: 14, margin: 0 }}>
              Select an order and a vehicle to check the operating constraints.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {ev.rules.map(([ok, pass, fail], idx) => (
                <li
                  key={idx}
                  style={{
                    padding: "6px 0", fontSize: 14, fontWeight: 700,
                    borderBottom: idx < ev.rules.length - 1 ? "1px solid var(--g200)" : "none",
                    color: ok ? "var(--green-text)" : "var(--red-text)",
                  }}
                >
                  {ok ? `✓ ${pass}` : `✗ ${fail}`}
                </li>
              ))}
              {ev.ok && selectedOrder && (
                <li style={{ paddingTop: 8, fontSize: 13, color: "var(--g600)" }}>
                  Expected arrival {ev.etaByOrder[selectedOrder.id]} · trip time {ev.minutes} min
                </li>
              )}
            </ul>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--g200)", paddingTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="primary" disabled={!ev?.ok} onClick={handleAssign}>Assign to vehicle</Button>
          <Link
            href={selectedOrder ? `/dispatcher/defer?order=${encodeURIComponent(selectedOrder.id)}` : "/dispatcher/defer"}
            style={{
              display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 16px", borderRadius: 8,
              border: "1px solid var(--on-yellow)", background: "var(--yellow)", color: "var(--on-yellow)",
              fontWeight: 500, textDecoration: "none",
            }}
          >
            Defer with reason
          </Link>
        </div>

        {message && <p role="status" style={{ fontSize: 13, color: "var(--g600)", marginTop: 12 }}>{message}</p>}
      </div>

      {deferred.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 18 }}>Deferred ({deferred.length})</h2>
          {deferred.map(({ order, reason }) => (
            <div key={order.dbId} style={{ ...card(false), cursor: "default" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{order.id} · {order.label}</div>
              <div style={{ color: "var(--red-text)", fontSize: 13, marginTop: 4 }}>{reason}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}