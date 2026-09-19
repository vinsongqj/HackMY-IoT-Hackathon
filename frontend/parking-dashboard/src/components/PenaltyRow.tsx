import type { Penalty } from "../types";

export function PenaltyRow({ penalty }: { penalty: Penalty }) {
  return (
    <tr>
      <td className="mono">{new Date(penalty.occurredAt).toLocaleTimeString()}</td>
      <td style={{ maxWidth: 320 }}>
        <span className="pill red">PENALTY</span>
      </td>
      <td className="mono">{penalty.component || "—"}</td>
      <td className="mono">{penalty.plate ?? "—"}</td>
      <td>${penalty.fineAmount.toFixed(2)}</td>
      <td className="muted" style={{ fontSize: 11 }}>
        {penalty.reason}
      </td>
    </tr>
  );
}