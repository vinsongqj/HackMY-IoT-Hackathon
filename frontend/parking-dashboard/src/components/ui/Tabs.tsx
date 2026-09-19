interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}

export function Tabs<T extends string>({ value, onChange, options }: Props<T>) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map((o) => (
        <button
          key={o.value}
          className={`btn ${value === o.value ? "primary" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}