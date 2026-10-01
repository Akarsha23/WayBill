// app/dispatcher/route/[vehicleId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROUTE_STOPS, VEHICLES } from "@/lib/dispatcher/data";
import { Tag } from "@/components/dispatcher/ui";

export default function RouteDetailPage({ params }: { params: { vehicleId: string } }) {
  const vehicle = VEHICLES.find((v) => v.id === params.vehicleId);
  const stops = ROUTE_STOPS[params.vehicleId];
  if (!vehicle || !stops) return notFound();

  return (
    <div>
      <div style={{ fontSize: 13, marginBottom: 10 }}>
        <Link href="/dispatcher/dashboard" style={{ textDecoration: "underline" }}>
          Dashboard
        </Link>{" "}
        / {vehicle.id}
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
        {vehicle.id} · {vehicle.driver}
      </h1>
      <p style={{ color: "var(--g600)", marginBottom: 16 }}>
        <Tag variant={vehicle.refrigerated ? "chill" : undefined}>{vehicle.typeLabel}</Tag>{" "}
        Colombo district · {stops.length} stops on this trip
      </p>

      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Stop", "Window", "ETA", "Unloading", "Late risk"].map((h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stops.map((s) => (
                <tr key={s.seq}>
                  <td style={td}>{s.seq}</td>
                  <td style={td}>
                    <b>{s.outletId}</b> {s.outletName}
                    {s.vanOnly && <Tag>Van only</Tag>}
                  </td>
                  <td style={td}>{s.window}</td>
                  <td style={td}>{s.eta}</td>
                  <td style={td}>{s.unloading}</td>
                  <td style={td}>
                    <span
                      className={`pill ${s.lateRiskPct > 25 ? "pill-late" : s.lateRiskPct > 12 ? "pill-deferred" : "pill-ok"}`}
                    >
                      <span className="dot" />
                      {s.lateRiskPct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {stops.some((s) => s.vanOnly) && (
        <p style={{ color: "var(--g600)", fontSize: 14, marginBottom: 16 }}>
          Late risk is the Datathon lateness estimate (illustrative). A van-only stop on this{" "}
          {vehicle.van ? "van" : "truck"} {vehicle.van ? "is fine" : "cannot be served by this vehicle — reassign or defer it"}.
        </p>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/dispatcher/drivers" className="btn">
          Message driver
        </Link>
        <Link href="/dispatcher/defer" className="btn-yellow">
          Defer a stop
        </Link>
        <Link href="/dispatcher/decision-trail/ORD-4021" className="btn">
          Decision trail
        </Link>
      </div>

      <style>{`
        .card{background:var(--white);border:1px solid var(--g300);border-radius:12px;padding:16px;margin-bottom:16px}
        .btn,.btn-yellow{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:8px;font-weight:500;text-decoration:none}
        .btn{border:1px solid var(--g300);background:var(--white);color:var(--ink)}
        .btn-yellow{border:1px solid var(--on-yellow);background:var(--yellow);color:var(--on-yellow)}
      `}</style>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  textTransform: "uppercase",
  color: "var(--g600)",
  padding: "8px 12px",
  borderBottom: "1px solid var(--g300)",
};
const td: React.CSSProperties = {
  padding: "11px 12px",
  borderBottom: "1px solid var(--g200)",
  fontSize: 14,
  verticalAlign: "top",
};
