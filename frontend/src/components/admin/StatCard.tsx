interface Props {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "green" | "red" | "blue" | "orange";
}

export function StatCard({ label, value, sub, tone = "default" }: Props) {
  const color =
    tone === "green"  ? "var(--green)"  :
    tone === "red"    ? "var(--red)"    :
    tone === "blue"   ? "var(--blue)"   :
    tone === "orange" ? "var(--orange)" : "var(--text)";

  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}