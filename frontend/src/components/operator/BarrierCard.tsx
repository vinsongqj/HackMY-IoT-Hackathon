import type { Barrier } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface Props {
  barrier: Barrier;
  onOpen: (name: string) => void;
  onClose: (name: string) => void;
  onRepair: (name: string) => void;
}

export function BarrierCard({ barrier, onOpen, onClose, onRepair }: Props) {
  const busy = barrier.broken || barrier.isUnderMaintenance;

  const tone =
    barrier.state === "Open"    ? "green"  :
    barrier.state === "Closed"  ? "gray"   :
    barrier.state === "Opening" ? "blue"   : "orange";

  return (
    <div className="tile">
      <div className="tile-title">
        <span>{barrier.name}</span>
        <Badge tone={tone}>{barrier.state}</Badge>
      </div>

      <div className="tile-row">Zone: {barrier.zoneParent || "—"}</div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {barrier.broken && <Badge tone="red">BROKEN</Badge>}
        {barrier.isUnderMaintenance && <Badge tone="orange">MAINT</Badge>}
      </div>

      <div className="tile-actions">
        <Button disabled={busy || barrier.state === "Open"} onClick={() => onOpen(barrier.name)}>
          Open
        </Button>
        <Button disabled={busy || barrier.state === "Closed"} onClick={() => onClose(barrier.name)}>
          Close
        </Button>
        <Button variant="ghost" disabled={!barrier.broken} onClick={() => onRepair(barrier.name)}>
          Repair
        </Button>
      </div>
    </div>
  );
}