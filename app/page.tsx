import Link from "next/link";

const ROLES = [
  { href: "/store", name: "Store manager", text: "Order, change and receive." },
  { href: "/loader", name: "Loader", text: "Load, flag and release." },
  { href: "/driver", name: "Driver", text: "Deliver, prove and report." },
  { href: "/dispatcher/dashboard", name: "Dispatcher", text: "Plan, allocate and defer." },
];

export default function Home() {
  return (
    <main className="picker">
      <h1>Waybill</h1>
      <p className="sub">Waypoint Group's delivery system, seen by the people who order, plan, load and deliver.</p>
      <div className="picker-grid">
        {ROLES.map((r) => (
          <Link key={r.href} href={r.href} className="card role">
            <b>{r.name}</b>
            <span>{r.text}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
