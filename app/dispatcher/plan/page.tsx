// app/dispatcher/plan/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ORDERS as INITIAL_ORDERS, VEHICLES as INITIAL_VEHICLES } from "@/lib/dispatcher/data";

interface OrderItem {
  id: string;
  t: string;       // Temp class (Ambient, Chilled, Frozen)
  o: string;       // Outlet name
  kg: number;      // Weight
  m3: number;      // Volume
  van?: boolean;   // Requires van access
  unassignableReason?: string;
}

interface VehicleItem {
  id: string;
  n: string;       // Name/Label
  kg: number;      // Max weight
  m3: number;      // Max volume
  u: number;       // Used weight
  uv: number;      // Used volume
  f: number;       // Fuel %
  rt: number;      // Route count ran today
  r?: boolean;     // Refrigerated
  van?: boolean;   // Is a van
}

export default function AllocatePage() {
  const [orders, setOrders] = useState<OrderItem[]>(() =>
    INITIAL_ORDERS.map((o: any) => ({
      id: o.id,
      t: o.tempClass,
      o: o.outletName,
      kg: o.weightKg,
      m3: o.volumeM3,
      van: o.outletId?.includes("VAN") || false,
    }))
  );

  const [vehicles, setVehicles] = useState<VehicleItem[]>(() =>
    INITIAL_VEHICLES.map((v: any) => ({
      id: v.id,
      n: v.typeLabel,
      kg: v.weightCapKg,
      m3: v.volumeCapM3,
      u: v.usedKg || 0,
      uv: v.usedM3 || 0,
      f: v.fuelPercent ?? 100,
      rt: v.routeCount ?? 0,
      r: v.tempCapability !== "Ambient",
      van: v.typeLabel.toLowerCase().includes("van"),
    }))
  );

  const [so, setSo] = useState<number | null>(null);
  const [sv, setSv] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");

  function evalRules(o: OrderItem, v: VehicleItem) {
    return [
      [
        v.u + o.kg <= v.kg,
        `Weight fits (${v.u + o.kg} of ${v.kg} kg)`,
        `Over weight limit (${v.u + o.kg} of ${v.kg} kg)`,
      ],
      [
        v.uv + o.m3 <= v.m3,
        "Volume fits",
        "Over volume limit",
      ],
      [
        o.t === "Ambient" || !!v.r,
        "Cold-chain compatible",
        "Chilled or frozen goods need a refrigerated vehicle",
      ],
      [
        !o.van || !!v.van,
        "Outlet access OK",
        "Van-only outlet: trucks cannot serve it",
      ],
      [
        v.rt < 2,
        `Route count OK (${v.rt} of 2)`,
        "Vehicle already ran 2 routes today",
      ],
      [
        v.f > 10,
        `Fuel quota OK (${v.f}% left)`,
        `Fuel quota nearly used (${v.f}% left)`,
      ],
    ] as [boolean, string, string][];
  }

  const selectedOrder = so !== null && so < orders.length ? orders[so] : null;
  const selectedVehicle = sv !== null && sv < vehicles.length ? vehicles[sv] : null;
  const rules = selectedOrder && selectedVehicle ? evalRules(selectedOrder, selectedVehicle) : null;
  const assignDisabled = !rules || !rules.every((r) => r[0]);

  function handleAssign() {
    if (so === null || sv === null || !selectedOrder || !selectedVehicle || assignDisabled) return;

    const updatedVehicles = [...vehicles];
    updatedVehicles[sv] = {
      ...selectedVehicle,
      u: selectedVehicle.u + selectedOrder.kg,
      uv: selectedVehicle.uv + selectedOrder.m3,
    };

    const updatedOrders = orders.filter((_, idx) => idx !== so);

    setVehicles(updatedVehicles);
    setOrders(updatedOrders);
    setMessage(`${selectedOrder.id} assigned to ${selectedVehicle.id}. Recorded in the decision trail.`);
    setSo(null);
    setSv(null);
  }

  function handleAutoAllocate() {
    let assignedCount = 0;
    const autoDeferred: string[] = [];
    let currentVehicles = [...vehicles];
    const remainingOrders: OrderItem[] = [];

    for (const o of orders) {
      let bestVehIdx = -1;
      const failureReasons: string[] = [];

      for (let j = 0; j < currentVehicles.length; j++) {
        const v = currentVehicles[j];
        const c = evalRules(o, v);
        if (c.every((x) => x[0])) {
          bestVehIdx = j;
          break;
        } else {
          const failed = c.filter((x) => !x[0]).map((x) => x[2]);
          failureReasons.push(`${v.id}: ${failed.join(", ")}`);
        }
      }

      if (bestVehIdx !== -1) {
        const v = currentVehicles[bestVehIdx];
        currentVehicles[bestVehIdx] = {
          ...v,
          u: v.u + o.kg,
          uv: v.uv + o.m3,
        };
        assignedCount++;
      } else {
        autoDeferred.push(`${o.id} (${o.o})`);
        remainingOrders.push({
          ...o,
          unassignableReason: failureReasons.join(" | "),
        });
      }
    }

    setOrders(remainingOrders);
    setVehicles(currentVehicles);
    setSo(null);
    setSv(null);

    if (autoDeferred.length > 0) {
      setMessage(
        `Auto-allocation finished: ${assignedCount} order(s) assigned. ${autoDeferred.length} order(s) could not fit any vehicle and remain queued: ${autoDeferred.join(", ")}`
      );
    } else {
      setMessage(`Auto-allocation complete: All ${assignedCount} order(s) successfully assigned!`);
    }
  }

  return (
    <div style={{ maxWidth: 1180, width: "100%", margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
        Allocate orders
      </h1>
      <p className="sub" style={{ color: "var(--g600)", marginBottom: 16 }}>
        Use automatic allocation to assign the entire queue instantly based on vehicle rules, or make manual decisions with real-time validation.
      </p>

      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="btn y"
          data-dsp-id="auto-btn"
          onClick={handleAutoAllocate}
          style={{
            background: "var(--yellow)",
            color: "var(--on-yellow)",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ⚡ Run Automatic Allocation
        </button>
      </div>

      <div className="grid g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Orders Column */}
        <div>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>1. Order</h2>
          <div data-dsp-id="orders">
            {orders.length === 0 ? (
              <p className="sub" style={{ color: "var(--g600)" }}>All orders allocated or deferred.</p>
            ) : (
              orders.map((o, i) => (
                <div
                  key={o.id}
                  onClick={() => setSo(i)}
                  className={`opt${so === i ? " on" : ""}`}
                  data-k="o"
                  data-i={i}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: so === i ? "2px solid var(--ink)" : "1px solid var(--g300)",
                    background: so === i ? "var(--g100, #f3f4f6)" : "var(--white)",
                    marginBottom: 8,
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <b>{o.id} · {o.t}</b>
                    <br />
                    <small style={{ color: "var(--g600)" }}>{o.o} · {o.kg} kg · {o.m3} m³</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Vehicles Column */}
        <div>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>2. Vehicle</h2>
          <div data-dsp-id="vehs">
            {vehicles.map((v, i) => (
              <div
                key={v.id}
                onClick={() => setSv(i)}
                className={`opt${sv === i ? " on" : ""}`}
                data-k="v"
                data-i={i}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: sv === i ? "2px solid var(--ink)" : "1px solid var(--g300)",
                  background: sv === i ? "var(--g100, #f3f4f6)" : "var(--white)",
                  marginBottom: 8,
                  cursor: "pointer",
                }}
              >
                <div>
                  <b>{v.id} · {v.n}</b>
                  <br />
                  <small style={{ color: "var(--g600)" }}>
                    {v.kg > 0 ? Math.round((v.u / v.kg) * 100) : 0}% wt · {v.m3 > 0 ? Math.round((v.uv / v.m3) * 100) : 0}% vol · fuel {v.f}% · routes {v.rt}/2
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rules Validation Card */}
      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Manual Rule Check</h2>
        <ul className="chk" data-dsp-id="checks" style={{ paddingLeft: 20, margin: "12px 0" }}>
          {orders.length === 0 ? (
            <li>No active orders in queue.</li>
          ) : !rules ? (
            <li>Select an order and a vehicle to evaluate operating constraints.</li>
          ) : (
            rules.map((r, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {r[0] ? (
                  <span className="ok" style={{ color: "green", fontWeight: 600 }}>✓ {r[1]}</span>
                ) : (
                  <span className="no" style={{ color: "red", fontWeight: 600 }}>✗ {r[2]}</span>
                )}
              </li>
            ))
          )}
        </ul>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button
            type="button"
            className="btn pri"
            data-dsp-id="assign"
            disabled={assignDisabled}
            onClick={handleAssign}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: assignDisabled ? "var(--g300)" : "var(--ink)",
              color: assignDisabled ? "var(--g600)" : "var(--paper)",
              fontWeight: 600,
              cursor: assignDisabled ? "not-allowed" : "pointer",
            }}
          >
            Assign to vehicle
          </button>
          <Link
            className="btn y"
            href="/dispatcher/defer"
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              background: "var(--yellow)",
              color: "var(--on-yellow)",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Defer with reason
          </Link>
        </div>

        <p
          className="sub"
          data-dsp-id="msg"
          style={{
            margin: "12px 0 0",
            color: assignDisabled && rules ? "red" : "var(--g600)",
            fontSize: 14,
          }}
        >
          {assignDisabled && rules
            ? "This assignment breaks a rule. Choose another vehicle or defer the order."
            : message}
        </p>
      </div>

      <style>{`
        .card {
          background: var(--white);
          border: 1px solid var(--g300);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
}