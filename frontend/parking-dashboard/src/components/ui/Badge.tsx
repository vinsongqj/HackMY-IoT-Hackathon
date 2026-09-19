type Tone = "gray" | "green" | "orange" | "red" | "blue" | "purple";

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return <span className={`pill ${tone === "gray" ? "" : tone}`}>{children}</span>;
}