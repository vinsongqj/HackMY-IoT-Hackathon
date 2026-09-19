import type { ExhaustFan } from "../types";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface Props {
  fan: ExhaustFan;
  onOn: (name: string) => void;
  onOff: (name: string) => void;
  onRepair: (name: string) => void;
}

export function FanCard({ fan, onOn, onOff, onRepair }: Props) {
  const busy = fan.broken || fan.isUnderMaintenance;
  return (
    <Card
      title={fan.name}
      right={<Badge tone={fan.isOn ? "green" : "gray"}>{fan.isOn ? "ON" : "OFF"}</Badge>}
    >
      <div className="card-row">Zone: {fan.zoneParent || "—"}</div>
      <div className="card-tags">
        {fan.broken && <Badge tone="red">BROKEN</Badge>}
        {fan.isUnderMaintenance && <Badge tone="orange">MAINT</Badge>}
      </div>
      <div className="card-actions">
        <Button disabled={busy || fan.isOn} onClick={() => onOn(fan.name)}>On</Button>
        <Button disabled={busy || !fan.isOn} onClick={() => onOff(fan.name)}>Off</Button>
        <Button variant="ghost" disabled={!fan.broken} onClick={() => onRepair(fan.name)}>Repair</Button>
      </div>
    </Card>
  );
}