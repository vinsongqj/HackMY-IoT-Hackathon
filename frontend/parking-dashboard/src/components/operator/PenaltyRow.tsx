import type { Penalty } from "../../types";
import { Badge } from "../ui/Badge";

export function PenaltyRow({ penalty }: { penalty: Penalty }) {
  return (
    <tr>
      <td><Badge tone="red">PENALTY</Badge></td>
      <td className="mono">{penalty.component || "—"}</td>
      <td className="mono">{penalty.plate ?? "—"}</td>
      <td>${penalty.fineAmount.toFixed(2)}</td>
      <td>{penalty.reason}</td>
      <td className="muted">
        {new Date(penalty.occurredAt).toLocaleTimeString()}
      </td>
    </tr>
  );
}