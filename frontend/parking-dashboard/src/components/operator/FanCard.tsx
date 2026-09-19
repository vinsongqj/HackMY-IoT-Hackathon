import type { ExhaustFan } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface Props {
  fan: ExhaustFan;
  onOn: (name: string) => void;
  onOff: (name: string) => void;
  onRepair: (name: string) => void;
}

export function FanCard({ fan, onOn, onOff, onRepair }: Props) {
  const busy = fan.broken || fan.isUnderMaintenance;

  return (
    <div className="tile">
      <div className="tile-title">
        <span>{fan.name}</span>
        <Badge tone={fan.isOn ? "green" : "gray"}>{fan.isOn ? "ON" : "OFF"}</Badge>
      </div>

      <div className="tile-row">Zone: {fan.zoneParent || "—"}</div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {fan.broken && <Badge tone="red">BROKEN</Badge>}
        {fan.isUnderMaintenance && <Badge tone="orange">MAINT</Badge>}
      </div>

      <div className="tile-actions">
        <Button disabled={busy || fan.isOn} onClick={() => onOn(fan.name)}>On</Button>
        <Button disabled={busy || !fan.isOn} onClick={() => onOff(fan.name)}>Off</Button>
        <Button variant="ghost" disabled={!fan.broken} onClick={() => onRepair(fan.name)}>
          Repair
        </Button>
      </div>
    </div>
  );
}