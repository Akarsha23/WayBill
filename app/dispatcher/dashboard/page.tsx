// app/dispatcher/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusPill, Tag, Bar } from "@/components/dispatcher/ui";
import { loadPlan, type PlanData } from "@/lib/dispatcher/loadPlan";
import { vehicleSummary, BUDGET } from "@/lib/dispatcher/allocation";
import type { RouteStatus } from "@/lib/dispatcher/types";

type Kpi = "all" | "onPlan" | "deferred" | "late" | "delivered";
type Filter = "all" | "attention" | "delivered";

const pct = (n: number, d: number) => (d > 0 ? Math.min(100, Math.round((n / d) * 100)) : 0);

export default function DashboardPage() {
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [depot, setDepot] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeKpi, setActiveKpi] = useState<Kpi>("all");
  const [search, setSearch] = useState("");
  const [showDeferred, setShowDeferred] = useState(false);

  useEffect(() => {
    loadPlan().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowDeferred(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const inDepot = (d: string) => depot === "all" || d === depot;
    const orders = data.orders.filter((o) => inDepot(o.depot));
    const vehicles = data.vehicles.filter((v) => inDepot(v.depot));

    const counts = { onPlan: 0, deferred: 0, late: 0, delivered: 0, waiting: 0 };
    orders.forEach((o) => {
      if (o.status === "assigned") counts.onPlan++;
      else if (o.status === "deferred") counts.deferred++;
      else if (o.status === "late") counts.late++;
      else if (o.status === "delivered") counts.delivered++;
      else if (o.status === "pending") counts.waiting++;
    });

    // One row per vehicle with work on the plan.
    const byVehicle = new Map<string, typeof orders>();
    orders
      .filter((o) => o.vehicleId && ["assigned", "delivered", "late"].includes(o.status))
      .forEach((o) => byVehicle.set(o.vehicleId!, [...(byVehicle.get(o.vehicleId!) ?? []), o]));

    const routes = [...byVehicle.entries()].map(([vehicleId, list]) => {
      list.sort((a, b) => (a.tripId ?? 0) - (b.tripId ?? 0) || a.seq - b.seq);
      const status: RouteStatus = list.some((o) => o.status === "late") ? "late" : list.every((o) => o.status === "delivered") ? "delivered" : "onPlan";
      const next = list.find((o) => o.status !== "delivered");
      const v = vehicles.find((x) => x.id === vehicleId);
      return {
        vehicleId, status, stops: list.length,
        type: v ? `${v.type}${v.reefer ? " · reefer" : ""}` : "Vehicle",
        nextStop: next ? `${next.outletLabel}${next.eta ? ` · ETA ${next.eta}` : ""}` : "—",
      };
    });

    return { orders, vehicles, counts, routes, deferred: orders.filter((o) => o.status === "deferred") };
  }, [data, depot]);

  if (loading) return <div style={{ color: "var(--g600)", fontSize: 14 }}>Loading dispatch data…</div>;
  if (error || !data || !view) return <p role="alert" style={{ color: "var(--red-text)" }}>Could not load dispatch data: {error}</p>;

  const rows = view.routes.filter((r) => {
    if (activeKpi !== "all" && r.status !== activeKpi) return false;
    if (filter === "attention") return r.status === "late";
    if (filter === "delivered") return r.status === "delivered";
    return true;
  });
  const q = search.toLowerCase().trim();
  const fleet = view.vehicles.filter((v) => !q || v.id.toLowerCase().includes(q) || v.type.includes(q) || v.depot.toLowerCase().includes(q));

  const onKpi = (k: Kpi) => {
    if (k === "deferred") setShowDeferred(true);
    else setActiveKpi((prev) => (prev === k ? "all" : k));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>Today&rsquo;s dispatch</h1>
          <p style={{ color: "var(--g600)", margin: 0 }}>{depot === "all" ? "All depots" : `${depot} depot`}</p>
        </div>
        <select aria-label="Depot" value={depot} onChange={(e) => setDepot(e.target.value)} style={{ minHeight: 40, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--g300)", background: "var(--white)", color: "var(--ink)" }}>
          <option value="all">All depots</option>
          <option>Peliyagoda</option>
          <option>Kandy</option>
        </select>
      </div>

      {view.deferred.length > 0 && (
        <div style={{ background: "var(--yellow)", color: "var(--on-yellow)", border: "1px solid var(--on-yellow)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div><b>{view.deferred.length} order{view.deferred.length > 1 ? "s" : ""} deferred</b>. The reason is recorded for each.</div>
          <button onClick={() => setShowDeferred(true)} style={{ background: "var(--on-yellow)", color: "var(--yellow)", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            View deferred orders
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Waiting to plan" value={view.counts.waiting} href="/dispatcher/plan" />
        <KpiCard label="On plan" value={view.counts.onPlan} color="var(--blue-text)" active={activeKpi === "onPlan"} onClick={() => onKpi("onPlan")} />
        <KpiCard label="Deferred" value={view.counts.deferred} color="var(--red-text)" onClick={() => onKpi("deferred")} />
        <KpiCard label="Late" value={view.counts.late} color="var(--red-text)" active={activeKpi === "late"} onClick={() => onKpi("late")} />
        <KpiCard label="Delivered" value={view.counts.delivered} color="var(--green-text)" active={activeKpi === "delivered"} onClick={() => onKpi("delivered")} />
      </div>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ marginTop: 0 }}>Today&rsquo;s routes{activeKpi !== "all" ? ` · ${activeKpi}` : ""}</h2>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {activeKpi !== "all" && (
              <button onClick={() => setActiveKpi("all")} style={chip(false)}>Clear filter ✕</button>
            )}
            {(["all", "attention", "delivered"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>
                {f === "all" ? "All" : f === "attention" ? "Needs attention" : "Delivered"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse" }}>
            <thead><tr>{["Vehicle", "Status", "Next stop", "Stops", ""].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {rows.length === 0 && <tr><Td colSpan={5}>No routes match this filter. <Link href="/dispatcher/plan" style={{ textDecoration: "underline" }}>Plan orders</Link></Td></tr>}
              {rows.map((r) => (
                <tr key={r.vehicleId}>
                  <Td><b>{r.vehicleId}</b><div style={{ fontSize: 13, color: "var(--g600)" }}>{r.type}</div></Td>
                  <Td><StatusPill status={r.status} /></Td>
                  <Td>{r.nextStop}</Td>
                  <Td>{r.stops}</Td>
                  <Td><Link href={`/dispatcher/route/${r.vehicleId}`} style={{ fontSize: 13, textDecoration: "underline" }}>Open</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        
      </section>
      <section className="card" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Fleet status</h2>
          <input aria-label="Search vehicles" placeholder="Search vehicle, type or depot" value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--g300)", fontSize: 14, width: "100%", maxWidth: 260, background: "var(--white)", color: "var(--ink)" }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
            <thead><tr>{["Vehicle", "Type", "Busiest trip load", "Time budget", "Weekly fuel", "Trips"].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {fleet.map((v) => {
                const s = vehicleSummary(v, data.trips, data.ctx);
                const mine = data.trips.filter((t) => t.vehicleId === v.id);
                const wt = Math.max(0, ...mine.map((t) => pct(t.orders.reduce((a, o) => a + o.kg, 0), v.kg)));
                const vol = Math.max(0, ...mine.map((t) => pct(t.orders.reduce((a, o) => a + o.m3, 0), v.m3)));
                const fuel = pct(s.fuelL, v.quotaL);
                return (
                  <tr key={v.id}>
                    <Td><Link href={`/dispatcher/route/${v.id}`} style={{ fontWeight: 700, color: "var(--blue-text)", textDecoration: "underline" }}>{v.id}</Link><div style={{ fontSize: 12, color: "var(--g600)" }}>{v.depot}</div></Td>
                    <Td>
                      <Tag variant={v.reefer ? "chill" : undefined}>{v.type}{v.reefer ? " · reefer" : ""}</Tag>
                      {v.workshop && <Tag variant="warn">In workshop</Tag>}
                    </Td>
                    <Td><Bar pct={wt} /> {wt}% wt · {vol}% vol</Td>
                    <Td>{s.freshMin}/{BUDGET.Fresh} fresh · {s.otherMin}/{BUDGET.other} other min</Td>
                    <Td><Bar pct={fuel} warnAbove={85} /> {fuel}% of {v.quotaL} L</Td>
                    <Td>{s.trips} of 2</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {showDeferred && (
        <div role="dialog" aria-modal="true" aria-label="Deferred orders" onClick={() => setShowDeferred(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--white)", borderRadius: 16, width: "90%", maxWidth: 760, maxHeight: "80vh", overflowY: "auto", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Deferred orders</h2>
              <button aria-label="Close" onClick={() => setShowDeferred(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--g600)" }}>✕</button>
            </div>
            {view.deferred.length === 0 ? <p style={{ color: "var(--g600)" }}>No deferred orders.</p> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr>{["Order", "Outlet", "Reason", ""].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
                  <tbody>
                    {view.deferred.map((o) => (
                      <tr key={o.id}>
                        <Td><Link href={`/dispatcher/decision-trail/${encodeURIComponent(o.code)}`} style={{ fontWeight: 700, textDecoration: "underline" }}>{o.code}</Link></Td>
                        <Td>{o.outletLabel}</Td>
                        <Td>{o.deferReason || "No reason recorded"}</Td>
                        <Td><Link href={`/dispatcher/plan?order=${encodeURIComponent(o.code)}`} style={{ fontSize: 13, textDecoration: "underline" }}>Allocate</Link></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`.card{background:var(--white);border:1px solid var(--g300);border-radius:12px;padding:16px;margin-bottom:16px}`}</style>
    </div>
  );
}

const chip = (on: boolean): React.CSSProperties => ({
  padding: "6px 12px", borderRadius: 999, border: "1px solid var(--g300)", fontSize: 13, cursor: "pointer",
  background: on ? "var(--ink)" : "var(--white)", color: on ? "var(--paper)" : "var(--g600)",
});

function KpiCard({ label, value, color, active, onClick, href }: { label: string; value: number; color?: string; active?: boolean; onClick?: () => void; href?: string }) {
  const style: React.CSSProperties = {
    display: "block", textAlign: "left", font: "inherit", width: "100%", color: "inherit", textDecoration: "none",
    background: "var(--white)", border: active ? `2px solid ${color ?? "var(--ink)"}` : "1px solid var(--g300)",
    borderRadius: 12, padding: 16, cursor: onClick || href ? "pointer" : "default",
  };
  const body = (
    <>
      <div style={{ fontSize: 13, color: "var(--g600)", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", color }}>{value}</div>
    </>
  );
  return href ? <Link href={href} style={style}>{body}</Link> : <button onClick={onClick} style={style}>{body}</button>;
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th style={{ textAlign: "left", fontSize: 12, textTransform: "uppercase", color: "var(--g600)", padding: "8px 12px", borderBottom: "1px solid var(--g300)", whiteSpace: "nowrap" }}>{children}</th>
);
const Td = ({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) => (
  <td colSpan={colSpan} style={{ padding: "11px 12px", borderBottom: "1px solid var(--g200)", fontSize: 14, verticalAlign: "top" }}>{children}</td>
);