import type { Light } from "../types";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface Props {
  light: Light;
  onOn: (name: string) => void;
  onOff: (name: string) => void;
}

export function LightCard({ light, onOn, onOff }: Props) {
  return (
    <Card
      title={light.name}
      right={<Badge tone={light.isOn ? "yellow" : "gray"}>{light.isOn ? "ON" : "OFF"}</Badge>}
    >
      <div className="card-row">Group: {light.group} · Zone: {light.zoneParent}</div>
      <div className="card-actions">
        <Button disabled={light.isOn}  onClick={() => onOn(light.name)}>On</Button>
        <Button disabled={!light.isOn} onClick={() => onOff(light.name)}>Off</Button>
      </div>
    </Card>
  );
}