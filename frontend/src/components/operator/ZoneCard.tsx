import type { Zone } from "../../types";
import { Badge } from "../ui/Badge";

export function ZoneCard({ zone }: { zone: Zone }) {
  const tone =
    zone.risk === "High"     || zone.risk === "Critical" ? "red"    :
    zone.risk === "Moderate" || zone.risk === "Mid"      ? "orange" :
    zone.risk === "Low"                                  ? "yellow" : "green";

  return (
    <div className="tile">
      <div className="tile-title">
        <span>{zone.name}</span>
        <Badge tone={tone}>{zone.risk}</Badge>
      </div>
      <div className="tile-row">CO: {zone.gasCarbonMonoxideLevel} ppm</div>
    </div>
  );
}