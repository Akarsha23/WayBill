"use client";

import { useState } from "react";
import { DRIVERS } from "@/lib/dispatcher/data";

export default function DriversPage() {
  const [simulateOffline, setSimulateOffline] = useState(false);

  const activeDrivers = DRIVERS.map((d, i) => {
    const offline = simulateOffline && i >= 2;
    return {
      ...d,
      offline,
      lastSynced: offline ? d.lastSyncedMin + 47 : d.lastSyncedMin,
      queued: offline ? d.queuedRecords + 3 : d.queuedRecords,
    };
  });

  const syncedCount = activeDrivers.filter((d) => !d.offline).length;
  const offlineCount = activeDrivers.filter((d) => d.offline).length;
  const totalQueued = activeDrivers.reduce((acc, d) => acc + d.queued, 0);

  return (
    <div style={{ maxWidth: 1180, width: "100%", margin: "0 auto", padding: 24 }}>
      {/* Page Header */}
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
        Driver sync
      </h1>
      <p
        style={{
          color: "var(--g600, #5A5A56)",
          fontSize: 15,
          lineHeight: "22px",
          margin: "0 0 16px",
          maxWidth: 760,
        }}
      >
        Real-time status of driver mobile synchronization. Track connected drivers, offline buffer queues, and last active timestamps.
      </p>

      {/* Simulation Toggle Controls */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setSimulateOffline(!simulateOffline)}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--g400, #C9C9C4)",
            background: simulateOffline ? "var(--ytint, #FFF8CC)" : "var(--white, #ffffff)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            color: "var(--ink, #121212)",
          }}
        >
          {simulateOffline ? "Disable offline simulation" : "Simulate driver offline state"}
        </button>
      </div>

      {/* KPI Metrics Summary Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div className="kpi">
          <div className="kpi-label">Synced drivers</div>
          <div className="kpi-val" style={{ color: "var(--green, #0A783C)" }}>
            {syncedCount} / {DRIVERS.length}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Offline drivers</div>
          <div className="kpi-val" style={{ color: offlineCount > 0 ? "var(--red, #C82323)" : "var(--ink, #121212)" }}>
            {offlineCount}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Queued records</div>
          <div className="kpi-val">{totalQueued}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Driver", "Vehicle", "Last synced", "Queued records", "State"].map((h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeDrivers.map((d) => (
                <tr key={d.driver} style={d.offline ? { background: "var(--ytint, #FFF8CC)" } : undefined}>
                  <td style={td}>
                    <b>{d.driver}</b>
                  </td>
                  <td style={td}>{d.vehicleId}</td>
                  <td style={td}>{d.lastSynced} min ago</td>
                  <td style={td}>{d.queued}</td>
                  <td style={td}>
                    <span className={`pill ${d.offline ? "pill-deferred" : "pill-ok"}`}>
                      <span className="dot" />
                      {d.offline ? "Offline · possibly stale" : "Synced"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .card {
          background: var(--white, #ffffff);
          border: 1px solid var(--g300, #DEDEDA);
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .kpi {
          background: var(--white, #ffffff);
          border: 1px solid var(--g300, #DEDEDA);
          border-radius: 12px;
          padding: 14px;
        }

        .kpi-label {
          font-size: 13px;
          color: var(--g600, #5A5A56);
        }

        .kpi-val {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--ink, #121212);
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .pill-ok {
          background: #DCFCE7;
          color: #15803D;
        }

        .pill-deferred {
          background: #FEF2F2;
          color: #B91C1C;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
      `}</style>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: ".04em",
  color: "var(--g600, #5A5A56)",
  padding: "8px 12px",
  borderBottom: "1px solid var(--g300, #DEDEDA)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "11px 12px",
  borderBottom: "1px solid var(--g200, #EAEAE6)",
  fontSize: 14,
  verticalAlign: "top",
};