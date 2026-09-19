import type { ParkingSpot } from "../types";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

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
    <Card
      title={spot.name}
      right={<Badge tone={occupied ? "red" : "green"}>{occupied ? "OCCUPIED" : "VACANT"}</Badge>}
    >
      <div className="card-row">{spot.purpose} · Zone {spot.zoneParent}</div>
      <div className="card-tags">
        <Badge tone={typeTone}>{spot.parkingForCarType}</Badge>
        {spot.broken && <Badge tone="red">BROKEN</Badge>}
        {spot.isUnderMaintenance && <Badge tone="orange">MAINT</Badge>}
      </div>
      {occupied && (
        <div className="card-row" style={{ color: "var(--text)" }}>
          🚗 {spot.detectedCars.join(", ")}
        </div>
      )}
      <div className="card-actions">
        {onSendCar && spot.purpose === "Park" && (
          <Button disabled={occupied || spot.broken || spot.isUnderMaintenance} onClick={() => onSendCar(spot.name)}>
            Send car
          </Button>
        )}
        <Button variant="ghost" disabled={!spot.broken || occupied} onClick={() => onRepair(spot.name)}>
          Repair
        </Button>
      </div>
    </Card>
  );
}