interface Props {
  label: string;
  value: string | number;
}

export function StatCard({ label, value }: Props) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}