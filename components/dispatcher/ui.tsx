// components/dispatcher/ui.tsx
"use client";

import { RouteStatus } from "@/lib/dispatcher/types";

const STATUS_LABEL: Record<RouteStatus, string> = {
  onPlan: "On plan",
  deferred: "Deferred",
  late: "Late",
  delivered: "Delivered",
};

export function StatusPill({ status }: { status: RouteStatus }) {
  return (
    <span className={`pill pill-${status}`}>
      <span className="dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function OkShortPill({ ok }: { ok: boolean }) {
  return (
    <span className={`pill ${ok ? "pill-ok" : "pill-short"}`}>
      <span className="dot" />
      {ok ? "Sufficient" : "Shortfall"}
    </span>
  );
}

export function Tag({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "warn" | "chill";
}) {
  return (
    <span className={`tag ${variant ? `tag-${variant}` : ""}`}>{children}</span>
  );
}

export function Bar({ pct, warnAbove = 90 }: { pct: number; warnAbove?: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <span
      style={{
        display: "inline-block",
        width: 80,
        height: 6,
        background: "var(--g200)",
        borderRadius: 999,
        overflow: "hidden",
        verticalAlign: "middle",
        marginRight: 6,
      }}
    >
      <span
        style={{
          display: "block",
          height: "100%",
          width: `${clamped}%`,
          background: pct > warnAbove ? "var(--red)" : "var(--blue)",
        }}
      />
    </span>
  );
}

export function Button({
  children,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "yellow";
}) {
  const bg =
    variant === "primary"
      ? "var(--ink)"
      : variant === "yellow"
      ? "var(--yellow)"
      : "var(--white)";
  const color =
    variant === "primary" ? "var(--paper)" : variant === "yellow" ? "var(--on-yellow)" : "var(--ink)";
  const border = variant === "default" ? "var(--g400)" : "var(--ink)";
  return (
    <button
      {...props}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 44,
        padding: "0 16px",
        borderRadius: 8,
        border: `1px solid ${border}`,
        background: bg,
        color,
        fontWeight: 500,
        fontSize: 14,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.45 : 1,
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}
