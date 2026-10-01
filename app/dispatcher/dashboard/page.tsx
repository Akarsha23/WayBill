// app/dispatcher/dashboard/page.tsx
"use client";

import { useMemo, useState } from "react";
import "@/app/globals.css";
import Link from "next/link";
import { VEHICLES, ROUTES_TODAY } from "@/lib/dispatcher/data";
import { StatusPill, Tag, Bar } from "@/components/dispatcher/ui";
import { RouteStatus } from "@/lib/dispatcher/types";

type Filter = "all" | "attention" | "delivered";

export default function DashboardPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c: Record<RouteStatus, number> = { onPlan: 0, deferred: 0, late: 0, delivered: 0 };
    ROUTES_TODAY.forEach((r) => (c[r.status] += 1));
    return c;
  }, []);

  const visibleRoutes = useMemo(() => {
    return ROUTES_TODAY.filter((r) => {
      if (filter === "all") return true;
      if (filter === "attention") return r.status === "deferred" || r.status === "late";
      return r.status === "delivered";
    });
  }, [filter]);

  return (
    <div style={{ maxWidth: 1180, width: "100%", margin: "0 auto", padding: 24 }}>
      {/* Page Title & Subtitle */}
      <h1
        style={{
          fontSize: 32,
          lineHeight: "34px",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          margin: "0 0 6px",
          color: "var(--ink, #121212)",
        }}
      >
        Today&rsquo;s dispatch
      </h1>
      <p
        style={{
          color: "var(--g600, #5A5A56)",
          fontSize: 15,
          lineHeight: "22px",
          margin: "0 0 16px",
          maxWidth: 720,
        }}
      >
        Peliyagoda depot · Waypoint Fresh · Colombo district
      </p>

      {/* Alert Banner */}
      <div
        style={{
          background: "var(--yellow, #FFDD00)",
          color: "var(--onY, #121212)",
          border: "1px solid var(--onY, #121212)",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 16,
          fontSize: 14,
          fontFamily: '"Schibsted Grotesk", system-ui, -apple-system, sans-serif',
        }}
      >
        <b>Payday Friday:</b> demand is forecast to exceed capacity today. 3 orders are deferred
        — a reason is required before close.{" "}
        <Link href="/dispatcher/plan" style={{ textDecoration: "underline", fontWeight: 700 }}>
          Suggest plan
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Kpi label="On plan" value={counts.onPlan} color="var(--blue, #0052CC)" onClick={() => setFilter("all")} />
        <Kpi label="Deferred" value={counts.deferred} color="var(--ink, #121212)" onClick={() => setFilter("attention")} />
        <Kpi label="Late" value={counts.late} color="var(--red, #C82323)" onClick={() => setFilter("attention")} />
        <Kpi label="Delivered" value={counts.delivered} color="var(--g700, #40403C)" onClick={() => setFilter("delivered")} />
      </div>

      {/* Fleet Status Card */}
      <section className="card">
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px", color: "var(--ink, #121212)" }}>
          Fleet status
        </h2>
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
              {VEHICLES.map((v) => {
                const wtPct = Math.round((v.usedKg / v.weightCapKg) * 100);
                const volPct = Math.round((v.usedM3 / v.volumeCapM3) * 100);
                return (
                  <tr key={v.id}>
                    <Td>
                      <b>{v.id}</b> · {v.driver}
                    </Td>
                    <Td>
                      <Tag variant={v.refrigerated ? "chill" : undefined}>{v.typeLabel}</Tag>
                    </Td>
                    <Td>
                      <Bar pct={wtPct} /> {wtPct}% wt · {volPct}% vol
                    </Td>
                    <Td>
                      <Bar pct={100 - v.fuelQuotaPctLeft} warnAbove={85} /> {100 - v.fuelQuotaPctLeft}% used
                    </Td>
                    <Td>{v.routesToday} of 2</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Today's Routes Card */}
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--ink, #121212)" }}>
            Today&rsquo;s routes
          </h2>
          <div style={{ display: "flex", gap: 6 }}>
            {(["all", "attention", "delivered"] as Filter[]).map((f) => {
              const isActive = filter === f;
              return (
                <button
                  key={f}
                  className={`tb ${filter === f ? "on" : ""}`}
                  type="button"
                  onClick={() => { console.log("clicked", f); setFilter(f); }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 99,
                    border: `1px solid ${isActive ? "var(--ink, #121212)" : "var(--g300, #DEDEDA)"}`,
                    background: isActive ? "var(--ink, #121212)" : "var(--white, #ffffff)",
                    color: isActive ? "var(--paper, #FAFAF8)" : "var(--g600, #5A5A56)",
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {f === "all" ? "All" : f === "attention" ? "Needs attention" : "Delivered"}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Driver / vehicle", "Status", "Next stop", "ETA", "Left", ""].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRoutes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--g600, #5A5A56)" }}>
                    No routes found for this filter.
                  </td>
                </tr>
              ) : (
                visibleRoutes.map((r) => (
                  <tr key={r.vehicleId} style={r.status === "deferred" ? { background: "var(--ytint, #FFF8CC)" } : undefined}>
                    <Td>
                      <b>{r.driver}</b>
                      <div style={{ fontSize: 13, color: "var(--g600, #5A5A56)" }}>
                        {r.vehicleId} · {r.vehicleType}
                      </div>
                    </Td>
                    <Td>
                      <StatusPill status={r.status} />
                    </Td>
                    <Td>{r.nextStop}</Td>
                    <Td>{r.eta}</Td>
                    <Td>{r.stopsLeft}</Td>
                    <Td>
                      <Link
                        href={
                          r.status === "deferred"
                            ? "/dispatcher/defer"
                            : `/dispatcher/route/${r.vehicleId}`
                        }
                        style={{ fontSize: 13, textDecoration: "underline", color: "inherit" }}
                      >
                        {r.status === "deferred" ? "Defer" : "Open"}
                      </Link>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .card {
          background: var(--white, #ffffff);
          border: 1px solid var(--g300, #DEDEDA);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
}

function Kpi({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value: number;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        background: "var(--white, #ffffff)",
        border: "1px solid var(--g300, #DEDEDA)",
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
        width: "100%",
      }}
    >
      <div style={{ fontSize: 13, color: "var(--g600, #5A5A56)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", color: color || "var(--ink, #121212)" }}>
        {value}
      </div>
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: "var(--g600, #5A5A56)",
        padding: "8px 12px",
        borderBottom: "1px solid var(--g300, #DEDEDA)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "11px 12px",
        borderBottom: "1px solid var(--g200, #EAEAE6)",
        fontSize: 14,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}