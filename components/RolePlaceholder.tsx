import Link from "next/link";

export default function RolePlaceholder({ role, screens }: { role: string; screens: string[] }) {
  return (
    <main className="picker">
      <h1>{role}</h1>
      <p className="sub">Not ported yet. Screens to build from the prototype:</p>
      <ul>{screens.map((s) => <li key={s}>{s}</li>)}</ul>
      <Link href="/" className="btn">Back to roles</Link>
    </main>
  );
}
