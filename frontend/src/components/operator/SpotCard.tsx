import type { ParkingSpot } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface Props {
  spot: ParkingSpot;
  onRepair: (name: string) => void;
  onSendCar?: (name: string) => void;
}

export function SpotCard({ spot, onRepair, onSendCar }: Props) {
  const occupied = spot.detectedCars > 0;
  const typeTone =
    spot.parkingForCarType === "Electric"   ? "blue"   :
    spot.parkingForCarType === "Accessible" ? "yellow" : "gray";

  return (
    <div className="row-item">
      <span className="row-item-name">{spot.name}</span>

      <Badge tone={occupied ? "red" : "green"}>
        {occupied ? "OCCUPIED" : "VACANT"}
      </Badge>

      <span className="row-item-meta">
        {spot.purpose} · Zone {spot.zoneParent}
      </span>

      <div className="row-item-badges">
        <Badge tone={typeTone}>{spot.parkingForCarType}</Badge>
        {spot.broken && <Badge tone="red">BROKEN</Badge>}
        {spot.isUnderMaintenance && <Badge tone="orange">MAINT</Badge>}
      </div>

      {occupied && (
        <span className="row-item-meta" style={{ color: "var(--text)" }}>
          🚗 {spot.detectedCars} car{spot.detectedCars > 1 ? "s" : ""}
        </span>
      )}

      <span className="row-item-spacer" />

      <div className="row-item-actions">
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
