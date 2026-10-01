// app/dispatcher/capacity/page.tsx
"use client";

import { useState } from "react";
import "@/app/globals.css";
import { CAPACITY_WEEKS } from "@/lib/dispatcher/data";
import { OkShortPill } from "@/components/dispatcher/ui";

export default function CapacityPage() {
  const [weekIndex, setWeekIndex] = useState(1); // default to festival-ramp week
  const week = CAPACITY_WEEKS[weekIndex];
  const shortfalls = week.gaps.filter((g) => g.available < g.needed);

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
        Plan future capacity
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
        Forecast demand against vehicles, drivers and refrigerated capacity.
      </p>

      {/* Depot & Week Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          background: "var(--white, #ffffff)",
          border: "1px solid var(--g300, #DEDEDA)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 180 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 6,
              color: "var(--ink, #121212)",
            }}
          >
            Depot
          </label>
          <select style={selectStyle}>
            <option>Peliyagoda</option>
            <option>Kandy</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 6,
              color: "var(--ink, #121212)",
            }}
          >
            Forecast week
          </label>
          <select
            style={selectStyle}
            value={weekIndex}
            onChange={(e) => setWeekIndex(Number(e.target.value))}
          >
            {CAPACITY_WEEKS.map((w, i) => (
              <option key={w.label} value={i}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Volume Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--g600, #5A5A56)", marginBottom: 4 }}>
            Predicted total volume
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "var(--ink, #121212)",
            }}
          >
            {week.totalVolumeM3} m³
          </div>
          <div style={{ fontSize: 12, color: "var(--g600, #5A5A56)", marginTop: 4 }}>
            All brands · Peliyagoda
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--g600, #5A5A56)", marginBottom: 4 }}>
            Predicted chilled volume
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "var(--blue, #0052CC)",
            }}
          >
            {week.chilledVolumeM3} m³
          </div>
          <div style={{ fontSize: 12, color: "var(--g600, #5A5A56)", marginTop: 4 }}>
            Fresh brand only · requires reefer capacity
          </div>
        </div>
      </div>

      {/* Resource Gap Table */}
      <section className="card">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
            <thead>
              <tr>
                {["Resource", "Needed", "Available", "Gap", "Status"].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {week.gaps.map((g) => {
                const gap = g.available - g.needed;
                const ok = gap >= 0;
                return (
                  <tr key={g.resource}>
                    <td style={tdStyle}>
                      <b>{g.resource}</b>
                    </td>
                    <td style={tdStyle}>{g.needed}</td>
                    <td style={tdStyle}>{g.available}</td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        color: ok ? "var(--green, #0F8642)" : "var(--red, #C82323)",
                      }}
                    >
                      {gap > 0 ? "+" : gap < 0 ? "−" : ""}
                      {Math.abs(gap)}
                    </td>
                    <td style={tdStyle}>
                      <OkShortPill ok={ok} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Shortfall Summary Message */}
      <p style={{ color: "var(--g600, #5A5A56)", fontSize: 13, marginTop: 12 }}>
        {shortfalls.length > 0
          ? `Shortfalls in ${shortfalls.length} resource(s): ${shortfalls
              .map((s) => s.resource.toLowerCase())
              .join(", ")}. Consider borrowing reefer capacity from another depot or scheduling overtime drivers before the week starts.`
          : "Fleet covers forecast demand this week."}
      </p>

      <style>{`
        .card {
          background: var(--white, #ffffff);
          border: 1px solid var(--g300, #DEDEDA);
          border-radius: 12px;
          padding: 16px;
        }
      `}</style>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--g600, #5A5A56)",
  padding: "8px 12px",
  borderBottom: "1px solid var(--g300, #DEDEDA)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "11px 12px",
  borderBottom: "1px solid var(--g200, #EAEAE6)",
  fontSize: 14,
  color: "var(--ink, #121212)",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "8px 10px",
  border: "1px solid var(--g300, #DEDEDA)",
  borderRadius: 8,
  background: "var(--white, #ffffff)",
  color: "var(--ink, #121212)",
  fontSize: 14,
  fontFamily: "inherit",
};