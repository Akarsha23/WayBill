// app/dispatcher/decision-trail/[orderId]/page.tsx
import { DecisionEvent } from "@/lib/dispatcher/types";

// In production: GET /api/orders/[orderId]/events — an append-only table
// (order_id, actor, action, reason, timestamp). Never mutate past entries;
// a correction is a new event, not an edit.
const SAMPLE_TRAIL: Record<string, DecisionEvent[]> = {
  "ORD-4021": [
    { actor: "Store manager", time: "5:40 PM yesterday", action: "Order placed" },
    { actor: "Store manager", time: "6:02 PM yesterday", action: "Confirmed before cutoff" },
    {
      actor: "Imesha Fernando",
      time: "6:45 AM",
      action: "Allocated to VEH014",
      detail: "truck cannot serve van-only outlet",
    },
    {
      actor: "Imesha Fernando",
      time: "6:52 AM",
      action: "Reassigned to VEH007 (reefer van)",
      detail: "rule check passed",
    },
  ],
};

export default function DecisionTrailPage({ params }: { params: { orderId: string } }) {
  const events = SAMPLE_TRAIL[params.orderId] ?? [
    { actor: "System", time: "—", action: "No recorded events for this order yet." },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
        Decision trail · {params.orderId}
      </h1>
      <p style={{ color: "var(--g600)", marginBottom: 16, maxWidth: 640 }}>
        Every change to this order, with who made it and why.
      </p>

      <div style={{ background: "var(--white)", border: "1px solid var(--g300)", borderRadius: 12, padding: 16 }}>
        <div style={{ borderLeft: "3px solid var(--g300)", marginLeft: 6, paddingLeft: 16 }}>
          {events.map((e, i) => (
            <div key={i} style={{ marginBottom: 16, position: "relative", fontSize: 14 }}>
              <span
                style={{
                  position: "absolute",
                  left: -23,
                  top: 4,
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "var(--ink)",
                }}
              />
              <b>{e.action}</b>
              <div style={{ color: "var(--g600)" }}>
                {e.actor} · {e.time}
                {e.detail ? ` · ${e.detail}` : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
