"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Tag, Button } from "@/components/dispatcher/ui";

const DEPOT_COORDS = { lat: 6.9652, lng: 79.8824 };

const OUTLET_COORDS: Record<string, { lat: number; lng: number }> = {
  "Nugegoda Outlet": { lat: 6.8722, lng: 79.8885 },
  "Kadawatha Outlet": { lat: 7.0016, lng: 79.9515 },
  "Dehiwala Outlet": { lat: 6.8511, lng: 79.8653 },
  "Maharagama Outlet": { lat: 6.848, lng: 79.9265 },
  default: { lat: 6.9271, lng: 79.8612 },
};

// Fetch all orders
const ordRes = await supabase.from("orders").select("*");

if (ordRes.data) {
  // Filter client-side with case-insensitivity & whitespace trimming
  const pendingOrders = ordRes.data.filter(
    (ord: any) => ord.status?.toString().trim().toLowerCase() === "pending"
  );
  
  console.log("Filtered Pending Orders:", pendingOrders);
  
  // Map pendingOrders to setOrders(...)
}

export function getHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getOSRMDrivingDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<number> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM HTTP error: ${res.status}`);
    const data = await res.json();
    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      return data.routes[0].distance / 1000;
    }
  } catch (err) {
    console.warn("OSRM endpoint unreachable, falling back to Haversine * 1.25:", err);
  }
  return getHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng) * 1.25;
}

interface OrderItem {
  id: string;        // order_code (e.g. ORD-4021)
  dbId: string | null; // Supabase primary key (id)
  t: string;
  o: string;
  kg: number;
  m3: number;
  van?: boolean;
  unassignableReason?: string;
  lat: number;
  lng: number;
}

interface VehicleItem {
  id: string;
  n: string;
  kg: number;
  m3: number;
  u: number;
  uv: number;
  f: number;
  rt: number;
  r?: boolean;
  van?: boolean;
  anchor: { lat: number; lng: number };
}

export default function AllocatePage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [so, setSo] = useState<number | null>(null);
  const [sv, setSv] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");
  const [vehicleDistances, setVehicleDistances] = useState<Record<string, number>>({});
  const [isAllocating, setIsAllocating] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        // Fetch vehicles, orders, and outlets independently to prevent join failure
        const [vehRes, ordRes, outletRes] = await Promise.all([
          supabase.from("vehicles").select("*"),
          supabase.from("orders").select("*").eq("status", "pending"),
          supabase.from("outlets").select("*"),
        ]);

        if (vehRes.error) console.error("Supabase Vehicles Fetch Error:", vehRes.error);
        if (ordRes.error) console.error("Supabase Orders Fetch Error:", ordRes.error);
        if (outletRes.error) console.error("Supabase Outlets Fetch Error:", outletRes.error);

        // Map Vehicles
        if (vehRes.data && vehRes.data.length > 0) {
          const loadedVehicles: VehicleItem[] = vehRes.data.map((v: any) => ({
            id: String(v.vehicle_id || v.id),
            n: v.type || "Reefer truck",
            kg: Number(v.weight_cap_kg) || 5000,
            m3: Number(v.volume_cap_m3) || 25,
            u: Number(v.used_weight_kg) || 0,
            uv: Number(v.used_volume_m3) || 0,
            f: v.fuel_percent ?? 100,
            rt: v.routes_today ?? 0,
            r: v.temp === "reefer" || v.temp === "Chilled",
            van: (v.type || "").toLowerCase().includes("van"),
            anchor: DEPOT_COORDS,
          }));
          setVehicles(loadedVehicles);
        } else {
          setVehicles([]);
        }

        // Map Outlets to a quick lookup map
        const outletMap = new Map<string, any>();
        if (outletRes.data) {
          outletRes.data.forEach((o: any) => {
            const key = String(o.outlet_id || o.id);
            outletMap.set(key, o);
          });
        }

        // Map Pending Orders
        if (ordRes.data && ordRes.data.length > 0) {
          const loadedOrders: OrderItem[] = ordRes.data.map((ord: any, idx: number) => {
            const outletKey = String(ord.outlet_id || "");
            const outlet = outletMap.get(outletKey) || {};
            const districtName = outlet.district || "Colombo";
            const coords =
              OUTLET_COORDS[districtName] || OUTLET_COORDS[outlet.brand] || OUTLET_COORDS.default;

            return {
              id: ord.order_code || `ORD-${4018 + idx}`,
              dbId: String(ord.id),
              t: ord.temp_class || "Ambient",
              o: `${outlet.brand || "Outlet"} (${districtName})`,
              kg: Number(ord.weight_kg) || 200,
              m3: Number(ord.volume_m3) || 1.0,
              van: outlet.parking_constraint === "van_only",
              lat: coords.lat + (Math.random() - 0.5) * 0.02,
              lng: coords.lng + (Math.random() - 0.5) * 0.02,
            };
          });
          setOrders(loadedOrders);
        } else {
          console.warn("No pending orders retrieved from database.");
          setOrders([]);
        }
      } catch (err) {
        console.error("Error fetching data from Supabase:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const selectedOrder = so !== null && so < orders.length ? orders[so] : null;
  const selectedVehicle = sv !== null && sv < vehicles.length ? vehicles[sv] : null;

  useEffect(() => {
    if (so === null || !orders[so]) {
      setVehicleDistances({});
      return;
    }

    const targetOrder = orders[so];

    async function updateDistances() {
      const entries = await Promise.all(
        vehicles.map(async (v) => {
          const dist = await getOSRMDrivingDistance(v.anchor, {
            lat: targetOrder.lat,
            lng: targetOrder.lng,
          });
          return [v.id, dist] as const;
        })
      );
      setVehicleDistances(Object.fromEntries(entries));
    }

    updateDistances();
  }, [so, orders, vehicles]);

  function evalRules(o: OrderItem, v: VehicleItem) {
    return [
      [
        v.u + o.kg <= v.kg,
        `Weight fits (${v.u + o.kg} of ${v.kg} kg)`,
        `Over weight limit (${v.u + o.kg} of ${v.kg} kg)`,
      ],
      [
        v.uv + o.m3 <= v.m3,
        `Volume fits (${(v.uv + o.m3).toFixed(1)} of ${v.m3} m³)`,
        `Over volume limit`,
      ],
      [
        o.t === "Ambient" || !!v.r,
        "Cold-chain compatible",
        "Chilled/frozen needs refrigerated vehicle",
      ],
      [
        !o.van || !!v.van,
        "Outlet access OK",
        "Van-only outlet constraint",
      ],
      [
        v.rt < 2,
        `Route count OK (${v.rt} of 2)`,
        "Vehicle at route limit (2/2)",
      ],
      [
        v.f > 10,
        `Fuel quota OK (${v.f}%)`,
        `Low fuel quota (${v.f}%)`,
      ],
    ] as [boolean, string, string][];
  }

  const rules = selectedOrder && selectedVehicle ? evalRules(selectedOrder, selectedVehicle) : null;
  const assignDisabled = !rules || !rules.every((r) => r[0]);

  async function handleAssign() {
    if (so === null || sv === null || !selectedOrder || !selectedVehicle || assignDisabled) return;

    try {
      setMessage("Updating database...");

try {
  setMessage("Updating database...");

        // 1. Insert into assigned_orders table
        const { error: insertError } = await supabase
          .from("assigned_orders") // Fixed spelling
          .upsert(
    {
      order_id: selectedOrder.dbId || selectedOrder.id,
      vehicle_id: selectedVehicle.id,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    },
  { onConflict: "order_id,vehicle_id" }
  )

        if (insertError) {
          console.error("Supabase Insert Error:", insertError);
          alert(`Insert failed: ${insertError.message}`);
          setMessage(`Error: ${insertError.message}`);
          return;
        }

        // 2. Update status in orders table
        let updateQuery = supabase
          .from("orders")
          .update({ status: "assigned" });

        if (selectedOrder.dbId) {
          updateQuery = updateQuery.eq("id", selectedOrder.dbId);
        } else {
          updateQuery = updateQuery.eq("order_code", selectedOrder.id);
        }

        const { error: updateError } = await updateQuery;

        if (updateError) {
          console.error("Supabase Update Error:", updateError);
          alert(`Update failed: ${updateError.message}`);
          setMessage(`Error: ${updateError.message}`);
          return;
        }

        // Local state updates...
      } catch (err: any) {
        console.error("Assign error:", err);
        setMessage(`Unexpected error: ${err.message}`);
      }

      // Local state update
      const updatedVehicles = [...vehicles];
      updatedVehicles[sv] = {
        ...selectedVehicle,
        u: selectedVehicle.u + selectedOrder.kg,
        uv: selectedVehicle.uv + selectedOrder.m3,
        anchor: { lat: selectedOrder.lat, lng: selectedOrder.lng },
      };

      const updatedOrders = orders.filter((_, idx) => idx !== so);

      setVehicles(updatedVehicles);
      setOrders(updatedOrders);
      setMessage(`${selectedOrder.id} assigned to ${selectedVehicle.id}`);
      setSo(null);
      setSv(null);
    } catch (err: any) {
      console.error("Assign error:", err);
      setMessage(`Unexpected error: ${err.message}`);
    }
  }

async function handleAutoAllocate() {
  setIsAllocating(true);
  setMessage("Calculating road distances via OSRM...");

  let assignedCount = 0;
  const autoDeferred: string[] = [];
  let currentVehicles = [...vehicles];
  const remainingOrders: OrderItem[] = [];

  for (const o of orders) {
    const validCandidates: { index: number; drivingDist: number }[] = [];
    const failureReasons: string[] = [];

    for (let j = 0; j < currentVehicles.length; j++) {
      const v = currentVehicles[j];
      const c = evalRules(o, v);

      if (c.every((x) => x[0])) {
        const drivingDist = await getOSRMDrivingDistance(v.anchor, {
          lat: o.lat,
          lng: o.lng,
        });
        validCandidates.push({ index: j, drivingDist });
      } else {
        const failed = c.filter((x) => !x[0]).map((x) => x[2]);
        failureReasons.push(`${v.id}: ${failed.join(", ")}`);
      }
    }

    if (validCandidates.length > 0) {
      validCandidates.sort((a, b) => a.drivingDist - b.drivingDist);
      const bestIdx = validCandidates[0].index;
      const v = currentVehicles[bestIdx];

      // 1. Insert into assigned_orders table
      const { error: insertError } = await supabase
        .from("assigned_orders")
        .insert({
          order_id: o.dbId || o.id,
          vehicle_id: v.id,
          status: "assigned",
        });

      if (insertError) {
        console.error(`Supabase insert error for ${o.id}:`, insertError);
      }

      // 2. Update order status in orders table
      if (o.dbId) {
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "assigned",
          })
          .eq("id", o.dbId);

        if (updateError) console.error(`Supabase assign error for ${o.id}:`, updateError);
      }

      currentVehicles[bestIdx] = {
        ...v,
        u: v.u + o.kg,
        uv: v.uv + o.m3,
        anchor: { lat: o.lat, lng: o.lng },
      };
      assignedCount++;
    } else {
      if (o.dbId) {
        const { error } = await supabase
          .from("orders")
          .update({ status: "deferred" })
          .eq("id", o.dbId);

        if (error) console.error(`Supabase defer error for ${o.id}:`, error);
      }
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
  setIsAllocating(false);

  if (autoDeferred.length > 0) {
    setMessage(`Assigned ${assignedCount} orders. ${autoDeferred.length} deferred.`);
  } else {
    setMessage(`Auto-allocation complete: All ${assignedCount} orders assigned!`);
  }
}

  if (loading) {
    return (
      <div style={{ color: "var(--g600)", fontSize: 14 }}>
        Loading orders and vehicles…
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
        Allocate an order
      </h1>
      <p style={{ color: "var(--g600)", marginBottom: 16, maxWidth: 640 }}>
        Pick an order and a vehicle, or let the system choose the nearest eligible vehicle for
        every order at once. The rules are checked before anything is assigned.
      </p>

      <div style={{ marginBottom: 20 }}>
        <Button variant="yellow" disabled={isAllocating || orders.length === 0} onClick={handleAutoAllocate}>
          ⚡ {isAllocating ? "Computing routes…" : "Run automatic allocation"}
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>1. Order</h2>
          {orders.length === 0 ? (
            <p style={{ color: "var(--g600)", fontSize: 14 }}>No pending orders found in database.</p>
          ) : (
            orders.map((o, i) => (
              <button
                key={o.id}
                onClick={() => setSo(i)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "var(--white)",
                  border: so === i ? "2px solid var(--ink)" : "1px solid var(--g300)",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 8,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {o.id} · <Tag variant={o.t !== "Ambient" ? "chill" : undefined}>{o.t}</Tag>
                </div>
                <div style={{ color: "var(--g600)", fontSize: 13, marginTop: 4 }}>
                  {o.o} {o.van && <Tag>Van only</Tag>} · {o.kg} kg · {o.m3} m³
                </div>
              </button>
            ))
          )}
        </div>

        <div>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>2. Vehicle</h2>
          {vehicles.length === 0 ? (
            <p style={{ color: "var(--g600)", fontSize: 14 }}>No vehicles found in database.</p>
          ) : (
            vehicles.map((v, i) => {
              const wtPct = v.kg > 0 ? Math.round((v.u / v.kg) * 100) : 0;
              const volPct = v.m3 > 0 ? Math.round((v.uv / v.m3) * 100) : 0;
              const dist = vehicleDistances[v.id];
              return (
                <button
                  key={v.id}
                  onClick={() => setSv(i)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "var(--white)",
                    border: sv === i ? "2px solid var(--ink)" : "1px solid var(--g300)",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 8,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {v.id} · {v.n}
                  </div>
                  <div style={{ color: "var(--g600)", fontSize: 13, marginTop: 4 }}>
                    {wtPct}% wt · {volPct}% vol · fuel {v.f}% · routes {v.rt}/2
                    {dist !== undefined && (
                      <>
                        {" · "}
                        <span style={{ color: "var(--blue-text)", fontWeight: 500 }}>
                          {dist.toFixed(1)} km away
                        </span>
                      </>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div
        style={{
          background: "var(--white)",
          border: "1px solid var(--g300)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Manual rule check</h2>

        <div style={{ marginBottom: 14 }}>
          {!rules ? (
            <p style={{ color: "var(--g600)", fontSize: 14, margin: 0 }}>
              Select an order and a vehicle to evaluate operating constraints.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {rules.map((r, idx) => (
                <li
                  key={idx}
                  style={{
                    padding: "6px 0",
                    borderBottom: idx < rules.length - 1 ? "1px solid var(--g200)" : "none",
                    fontSize: 14,
                    fontWeight: 700,
                    color: r[0] ? "var(--green-text)" : "var(--red-text)",
                  }}
                >
                  {r[0] ? `✓ ${r[1]}` : `✗ ${r[2]}`}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--g200)",
            paddingTop: 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Button variant="primary" disabled={assignDisabled} onClick={handleAssign}>
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
              textDecoration: "none",
            }}
          >
            Defer with reason
          </Link>
        </div>

        {message && (
          <p role="status" style={{ fontSize: 13, color: "var(--g600)", marginTop: 12 }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}