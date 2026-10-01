// app/dispatcher/layout.tsx
"use client";

import "./tokens.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle"; // <--- Import ThemeToggle

const NAV = [
  { href: "/dispatcher/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/dispatcher/orders", label: "Orders", icon: "☰" },
  { href: "/dispatcher/plan", label: "Allocate", icon: "⇄" },
  { href: "/dispatcher/capacity", label: "Capacity", icon: "▥" },
  { href: "/dispatcher/drivers", label: "Drivers", icon: "↻" },
  { href: "/dispatcher/profile", label: "Profile", icon: "●" },
];

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const currentNavItem = NAV.find((item) => pathname?.startsWith(item.href));
  const pageTitle = currentNavItem ? currentNavItem.label : "";

  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        background: "var(--paper)",
        minHeight: "100vh",
        display: "flex",
        width: "100%",
      }}
    >
      <nav
        style={{
          width: 100,
          flex: "none",
          background: "var(--white)",
          borderRight: "1px solid var(--g300)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          padding: "14px 6px",
          position: "sticky",
          top: 0,
          height: "100vh",
          boxSizing: "border-box",
        }}
        className="dispatcher-side-nav"
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: "var(--yellow)",
            border: "2px solid var(--on-yellow)",
            color: "var(--on-yellow)",
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
            marginBottom: 10,
          }}
        >
          W
        </div>
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                width: "100%",
                padding: "8px 2px",
                borderRadius: 8,
                fontSize: 12,
                color: active ? "var(--paper)" : "var(--g600)",
                background: active ? "var(--ink)" : "transparent",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              <b style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</b>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", width: "100%" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 24px",
          background: "var(--white)",
          borderBottom: "1px solid var(--g300)",
          position: "sticky",
          top: 0,
          zIndex: 4,
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Waypoint Dispatch</span>
          {pageTitle && (
            <>
              <span style={{ color: "var(--g400)", fontWeight: 400 }}>/</span>
              <span style={{ fontWeight: 600, fontSize: 15, color: "var(--g600)" }}>
                {pageTitle}
              </span>
            </>
          )}
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        <Link
          href="/dispatcher/profile"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--yellow)",
            color: "var(--on-yellow)",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          IF
        </Link>
      </header>

        <main style={{ padding: 24, width: "100%", boxSizing: "border-box" }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .dispatcher-side-nav {
            position: fixed; bottom: 0; left: 0; right: 0; top: auto;
            width: 100%; height: auto; flex-direction: row; justify-content: space-around;
            padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); z-index: 6;
            border-right: 0; border-top: 1px solid var(--g300);
          }
          .dispatcher-side-nav > div:first-child { display: none; }
        }
      `}</style>
    </div>
  );
}