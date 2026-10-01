// app/dispatcher/allocate/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ORDERS, VEHICLES } from "@/lib/dispatcher/data";
import { checkAssignment } from "@/lib/dispatcher/rules";
import { Button } from "@/components/dispatcher/ui";

export default function AllocatePage() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const order = ORDERS.find((o) => o.id === orderId) ?? null;
  const vehicle = VEHICLES.find((v) => v.id === vehicleId) ?? null;

  const checks = useMemo(() => {
    if (!order || !vehicle) return null;
    return checkAssignment(order, vehicle);
  }, [order, vehicle]);

  const canAssign = !!checks && checks.every((c) => c.ok);

  function handleAssign() {
    if (!order || !vehicle) return;
    // In production: POST /api/allocations { orderId, vehicleId }
    // then append a DecisionEvent and update the vehicle's used capacity server-side.
    setMessage(`${order.id} assigned to ${vehicle.id}. Recorded in the decision trail.`);
    setOrderId(null);
    setVehicleId(null);
  }

  return (
    <div>
      <div style={{ fontSize: 13, marginBottom: 10 }}>
        <Link href="/dispatcher/plan" style={{ textDecoration: "underline" }}>
          Suggest plan
        </Link>{" "}
        / Allocate one order
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
        Allocate an order
      </h1>
      <p style={{ color: "var(--g600)", marginBottom: 16 }}>
        Pick an order and a vehicle. The rules are checked before anything is assigned.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>1. Order</h2>
          {ORDERS.filter((o) => !o.pastCutoff).map((o) => (
            <Opt
              key={o.id}
              active={orderId === o.id}
              title={`${o.id} · ${o.tempClass}`}
              subtitle={`${o.outletId} ${o.outletName} · ${o.weightKg} kg · ${o.volumeM3} m³`}
              onClick={() => setOrderId(o.id)}
            />
          ))}
        </div>
        <div>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>2. Vehicle</h2>
          {VEHICLES.map((v) => (
            <Opt
              key={v.id}
              active={vehicleId === v.id}
              title={`${v.id} · ${v.typeLabel}`}
              subtitle={`${Math.round((v.usedKg / v.weightCapKg) * 100)}% wt · ${Math.round(
                (v.usedM3 / v.volumeCapM3) * 100
              )}% vol · fuel ${v.fuelQuotaPctLeft}% · routes ${v.routesToday}/2`}
              onClick={() => setVehicleId(v.id)}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          background: "var(--white)",
          border: "1px solid var(--g300)",
          borderRadius: 12,
          padding: 16,
          marginTop: 16,
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Rule check</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {checks
            ? checks.map((c) => (
                <li key={c.key} style={{ padding: "8px 0", borderBottom: "1px solid var(--g200)", fontSize: 14 }}>
                  {c.ok ? (
                    <span style={{ color: "var(--green-text)", fontWeight: 700 }}>✓ {c.label}</span>
                  ) : (
                    <span style={{ color: "var(--red-text)", fontWeight: 700 }}>✗ {c.failureLabel}</span>
                  )}
                </li>
              ))
            : <li style={{ padding: "8px 0", fontSize: 14 }}>Select an order and a vehicle.</li>}
        </ul>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <Button variant="primary" disabled={!canAssign} onClick={handleAssign}>
            Assign to vehicle
          </Button>
          <Link
            href="/dispatcher/defer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 44,
              padding: "0 16px",
              borderRadius: 8,
              border: "1px solid var(--on-yellow)",
              background: "var(--yellow)",
              color: "var(--on-yellow)",
              fontWeight: 500,
            }}
          >
            Defer with reason
          </Link>
        </div>
        {message && <p style={{ color: "var(--g600)", marginTop: 12, fontSize: 14 }}>{message}</p>}
      </div>
    </div>
  );
}

function Opt({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: 10,
        border: active ? "2px solid var(--ink)" : "1px solid var(--g300)",
        borderRadius: 10,
        marginBottom: 8,
        background: "var(--white)",
        cursor: "pointer",
      }}
    >
      <b style={{ fontSize: 14 }}>{title}</b>
      <div style={{ fontSize: 13, color: "var(--g600)" }}>{subtitle}</div>
    </button>
  );
}
