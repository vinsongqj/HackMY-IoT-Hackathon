import type { Light } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface Props {
  light: Light;
  onOn: (name: string) => void;
  onOff: (name: string) => void;
}

export function LightCard({ light, onOn, onOff }: Props) {
  return (
    <div className="tile">
      <div className="tile-title">
        <span>{light.name}</span>
        <Badge tone={light.isOn ? "yellow" : "gray"}>
          {light.isOn ? "ON" : "OFF"}
        </Badge>
      </div>

      <div className="tile-row">
        Group: {light.group} · Zone: {light.zoneParent}
      </div>

      <div className="tile-actions">
        <Button disabled={light.isOn}  onClick={() => onOn(light.name)}>On</Button>
        <Button disabled={!light.isOn} onClick={() => onOff(light.name)}>Off</Button>
      </div>
    </div>
  );
}