// app/dispatcher/orders/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ORDERS } from "@/lib/dispatcher/data";
import { Tag } from "@/components/dispatcher/ui";

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<string>("All");

  const filteredOrders = ORDERS.filter((o) => {
    if (activeTab === "Chilled") return o.tempClass === "Chilled";
    if (activeTab === "Ambient") return o.tempClass === "Ambient";
    if (activeTab === "Past cutoff") return o.pastCutoff;
    return true;
  });

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Page Title */}
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

      {/* Status Filter Tabs / Tags */}
      <div className="tabs" style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        <span
          className={`tag ${activeTab === "All" ? "on" : ""}`}
          onClick={() => setActiveTab("All")}
          style={{ cursor: "pointer" }}
        >
          All
        </span>
        <span
          className={`tag c ${activeTab === "Chilled" ? "on" : ""}`}
          onClick={() => setActiveTab("Chilled")}
          style={{ cursor: "pointer" }}
        >
          Chilled
        </span>
        <span
          className={`tag ${activeTab === "Ambient" ? "on" : ""}`}
          onClick={() => setActiveTab("Ambient")}
          style={{ cursor: "pointer" }}
        >
          Ambient
        </span>
        <span
          className={`tag w ${activeTab === "Past cutoff" ? "on" : ""}`}
          onClick={() => setActiveTab("Past cutoff")}
          style={{ cursor: "pointer" }}
        >
          Past cutoff
        </span>
      </div>

      {/* Table Container Card */}
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
          <table
            style={{
              width: "100%",
              minWidth: 640,
              borderCollapse: "collapse",
            }}
          >
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
              {filteredOrders.map((o) => (
                <tr key={o.id} style={o.pastCutoff ? { background: "var(--yellow-tint, #fefce8)" } : undefined}>
                  <td style={cell}>
                    <b>{o.id}</b>
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
                    {!o.pastCutoff && (
                      <Link
                        href="/dispatcher/plan/"
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .tabs {
          display: flex;
          gap: 6px;
          align-items: center;
        }

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

        .tag.c {
          background: #e0f2fe;
          color: #0369a1;
          border-color: #bae6fd;
        }

        .tag.w {
          background: #fef2f2;
          color: #b91c1c;
          border-color: #fecaca;
        }

        .tag.on {
          outline: 2px solid var(--ink, #111827);
        }
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