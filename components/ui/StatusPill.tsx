import type { RouteStatus } from "@/lib/types";

const STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  "on-plan":  { bg: "var(--blue-tint)",   fg: "var(--blue-text)",  label: "On plan" },
  "deferred": { bg: "var(--yellow)",      fg: "var(--on-yellow)",  label: "Deferred" },
  "late":     { bg: "var(--red-tint)",    fg: "var(--red-text)",   label: "Late" },
  "delivered":{ bg: "var(--g200)",        fg: "var(--g700)",       label: "Delivered" },
  "ok":       { bg: "var(--green-tint)",  fg: "var(--green-text)", label: "Sufficient" },
  "shortfall":{ bg: "var(--red-tint)",    fg: "var(--red-text)",   label: "Shortfall" },
};

type Props = {
  status: RouteStatus | "ok" | "shortfall";
  label?: string; // override the default text, e.g. a percentage
};

export default function StatusPill({ status, label }: Props) {
  const s = STYLES[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 500,
        padding: "4px 10px",
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.fg, flex: "none" }} />
      {label ?? s.label}
    </span>
  );
}
