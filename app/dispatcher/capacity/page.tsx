// app/dispatcher/capacity/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { OkShortPill } from "@/components/dispatcher/ui";
import { predictFutureCapacity } from "@/lib/dispatcher/ml-forecaster";

// Planning assumptions (shown on screen): Mon-Sat, two trips a day, 80% target fill.
const OPERATING_DAYS = 6;
const TRIPS_PER_DAY = 2;
const TARGET_FILL = 0.8;
const WEEKS = [1, 2, 3, 4];

interface Row { resource: string; unit: string; needed: number; available: number }
const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

export default function CapacityPage() {
  const [weekIndex, setWeekIndex] = useState(1);
  const [depot, setDepot] = useState("Peliyagoda");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [ord, veh] = await Promise.all([
        supabase.from("orders").select("created_at, volume_m3, temp_class, outlets ( depot )"),
        supabase.from("vehicles").select("*"),
      ]);
      if (ord.error || veh.error) setError((ord.error || veh.error)!.message);
      setOrders(ord.data ?? []);
      setVehicles(veh.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const result = useMemo(() => {
    const out = (o: any) => (Array.isArray(o.outlets) ? o.outlets[0] : o.outlets);
    const depotOrders = orders.filter((o) => out(o)?.depot === depot).map(({ outlets, ...rest }) => rest);
    const fleet = vehicles.filter((v) => v.depot === depot && norm(v.status) !== "in_workshop");
    const reefers = fleet.filter((v) => norm(v.temp) === "reefer");

    const forecast = predictFutureCapacity(depotOrders, weekIndex);
    const perWeek = OPERATING_DAYS * TRIPS_PER_DAY;
    const cap = (list: any[]) => list.reduce((s, v) => s + (Number(v.volume_cap_m3) || 0), 0) * perWeek;
    const avgCap = fleet.length ? fleet.reduce((s, v) => s + Number(v.volume_cap_m3), 0) / fleet.length : 0;

    const rows: Row[] = [
      { resource: "Volume capacity", unit: "m³ / week", needed: forecast.predictedTotal, available: Math.round(cap(fleet)) },
      { resource: "Refrigerated capacity", unit: "m³ / week", needed: forecast.predictedChilled, available: Math.round(cap(reefers)) },
      {
        resource: "Vehicles and drivers",
        unit: "vehicles",
        needed: avgCap ? Math.ceil(forecast.predictedTotal / (avgCap * perWeek * TARGET_FILL)) : 0,
        available: fleet.length,
      },
    ];
    return { forecast, rows, fleetSize: fleet.length, history: depotOrders.length };
  }, [orders, vehicles, depot, weekIndex]);

  const shortfalls = result.rows.filter((r) => r.available < r.needed);

  return (
    <div style={{ maxWidth: 1180, width: "100%", margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, lineHeight: "34px", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>Plan future capacity</h1>
      <p style={{ color: "var(--g600)", fontSize: 15, margin: "0 0 16px", maxWidth: 720 }}>
        Forecast weekly demand against the available fleet at one depot. Vehicles in the workshop are excluded.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", background: "var(--white)", border: "1px solid var(--g300)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={labelStyle} htmlFor="depot">Depot</label>
          <select id="depot" style={selectStyle} value={depot} onChange={(e) => setDepot(e.target.value)}>
            <option>Peliyagoda</option>
            <option>Kandy</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={labelStyle} htmlFor="week">Forecast week</label>
          <select id="week" style={selectStyle} value={weekIndex} onChange={(e) => setWeekIndex(Number(e.target.value))}>
            {WEEKS.map((w) => (
              <option key={w} value={w}>{w === 1 ? "Next week" : `${w} weeks ahead`}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p role="alert" style={{ color: "var(--red-text)", fontSize: 14 }}>Could not load data: {error}</p>}

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--g600)" }}>Running forecast…</div>
      ) : result.fleetSize === 0 ? (
        <p style={{ color: "var(--g600)" }}>No available vehicles are based at {depot}.</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
            <div className="card">
              <div style={{ fontSize: 13, color: "var(--g600)", marginBottom: 4 }}>Predicted total volume</div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em" }}>{result.forecast.predictedTotal} m³</div>
              <div style={{ fontSize: 12, color: "var(--g600)", marginTop: 4 }}>All brands · {depot} · from {result.history} past orders</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 13, color: "var(--g600)", marginBottom: 4 }}>Predicted chilled volume</div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--blue-text)" }}>{result.forecast.predictedChilled} m³</div>
              <div style={{ fontSize: 12, color: "var(--g600)", marginTop: 4 }}>Fresh only · needs refrigerated vehicles</div>
            </div>
          </div>

          <section className="card">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                  <tr>{["Resource", "Needed", "Available", "Gap", "Status"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => {
                    const gap = r.available - r.needed;
                    const ok = gap >= 0;
                    return (
                      <tr key={r.resource}>
                        <td style={tdStyle}><b>{r.resource}</b> <span style={{ color: "var(--g600)", fontSize: 12 }}>({r.unit})</span></td>
                        <td style={tdStyle}>{r.needed}</td>
                        <td style={tdStyle}>{r.available}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: ok ? "var(--green-text)" : "var(--red-text)" }}>
                          {gap > 0 ? "+" : gap < 0 ? "−" : ""}{Math.abs(gap)}
                        </td>
                        <td style={tdStyle}><OkShortPill ok={ok} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <p style={{ color: "var(--g600)", fontSize: 13, marginTop: 12 }}>
            {shortfalls.length > 0
              ? `Shortfall in ${shortfalls.map((s) => s.resource.toLowerCase()).join(", ")}. Consider returning workshop vehicles to service or adding capacity.`
              : "The fleet covers the forecast demand for this week."}
          </p>
          <p style={{ color: "var(--g600)", fontSize: 12, marginTop: 4 }}>
            Assumes {OPERATING_DAYS} operating days, {TRIPS_PER_DAY} trips per vehicle per day, and {TARGET_FILL * 100}% average fill. Each vehicle has its own driver.
          </p>
        </>
      )}

      <style>{`.card{background:var(--white);border:1px solid var(--g300);border-radius:12px;padding:16px}`}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 };
const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--g600)", padding: "8px 12px", borderBottom: "1px solid var(--g300)", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "11px 12px", borderBottom: "1px solid var(--g200)", fontSize: 14 };
const selectStyle: React.CSSProperties = { width: "100%", minHeight: 44, padding: "8px 10px", border: "1px solid var(--g300)", borderRadius: 8, background: "var(--white)", color: "var(--ink)", fontSize: 14, fontFamily: "inherit" };