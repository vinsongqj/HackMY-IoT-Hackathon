import type { ParkingSpot } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface Props {
  spot: ParkingSpot;
  onRepair: (name: string) => void;
  onSendCar?: (name: string) => void;
}

export function SpotCard({ spot, onRepair, onSendCar }: Props) {
  const occupied = spot.detectedCars.length > 0;
  const typeTone =
    spot.parkingForCarType === "Electric"   ? "blue"   :
    spot.parkingForCarType === "Accessible" ? "yellow" : "gray";

  return (
    <div className="tile">
      <div className="tile-title">
        <span>{spot.name}</span>
        <Badge tone={occupied ? "red" : "green"}>
          {occupied ? "OCCUPIED" : "VACANT"}
        </Badge>
      </div>

      <div className="tile-row">
        {spot.purpose} · Zone {spot.zoneParent}
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <Badge tone={typeTone}>{spot.parkingForCarType}</Badge>
        {spot.broken && <Badge tone="red">BROKEN</Badge>}
        {spot.isUnderMaintenance && <Badge tone="orange">MAINT</Badge>}
      </div>

      {occupied && (
        <div className="tile-row" style={{ color: "var(--text)" }}>
          🚗 {spot.detectedCars.join(", ")}
        </div>
      )}

      <div className="tile-actions">
        {onSendCar && spot.purpose === "Park" && (
          <Button
            disabled={occupied || spot.broken || spot.isUnderMaintenance}
            onClick={() => onSendCar(spot.name)}
          >
            Send car
          </Button>
        )}
        <Button
          variant="ghost"
          disabled={!spot.broken || occupied}
          onClick={() => onRepair(spot.name)}
        >
          Repair
        </Button>
      </div>
    </div>
  );
}