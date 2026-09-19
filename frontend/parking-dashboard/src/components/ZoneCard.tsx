import type { Zone } from "../types";
import { Badge } from "./ui/Badge";
import { Card } from "./ui/Card";

export function ZoneCard({ zone }: { zone: Zone }) {
  const tone =
    zone.risk === "High"     ? "red"    :
    zone.risk === "Moderate" ? "orange" :
    zone.risk === "Low"      ? "yellow" : "green";

  return (
    <Card title={zone.name} right={<Badge tone={tone}>{zone.risk}</Badge>}>
      <div className="card-row">CO: {zone.gasCarbonMonoxideLevel} ppm</div>
    </Card>
  );
}