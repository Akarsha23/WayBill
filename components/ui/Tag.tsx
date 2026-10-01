type Props = {
  children: React.ReactNode;
  variant?: "default" | "chill" | "warn";
};

const VARIANTS = {
  default: { bg: "var(--sunken)", fg: "var(--g700)", border: "var(--g300)" },
  chill:   { bg: "var(--blue-tint)", fg: "var(--blue-text)", border: "var(--blue-tint)" },
  warn:    { bg: "var(--red-tint)", fg: "var(--red-text)", border: "var(--red-tint)" },
};

export default function Tag({ children, variant = "default" }: Props) {
  const v = VARIANTS[variant];
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        padding: "2px 7px",
        borderRadius: 5,
        marginRight: 4,
        marginTop: 4,
        border: `1px solid ${v.border}`,
        background: v.bg,
        color: v.fg,
      }}
    >
      {children}
    </span>
  );
}
