import type { Barrier } from "../types";

interface Props {
  barrier: Barrier;
  onOpen: () => void;
  onClose: () => void;
  onRepair: () => void;
}

export function BarrierCard({ barrier, onOpen, onClose, onRepair }: Props) {
  const busy = barrier.broken || barrier.isUnderMaintenance;

  const stateColor =
    barrier.state === "Open"    ? "var(--green)" :
    barrier.state === "Closed"  ? "var(--text-dim)" :
    barrier.state === "Opening" ? "var(--blue)" :
                                  "var(--orange)";

  return (
    <div className="tile" style={{ borderLeftColor: stateColor }}>
      <div className="tile-title">
        <span>{barrier.name}</span>
        <span style={{ color: stateColor, fontSize: 12, fontWeight: 600 }}>
          {barrier.state}
        </span>
      </div>

      <div className="tile-row">Zone: {barrier.zoneParent || "—"}</div>

      <div className="tile-row" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {barrier.broken && <span className="pill red">BROKEN</span>}
        {barrier.isUnderMaintenance && (
          <span className="pill orange">
            MAINT
            {barrier.maintenanceEtaSeconds != null
              ? ` · ${barrier.maintenanceEtaSeconds}s`
              : ""}
          </span>
        )}
      </div>

      <div className="tile-actions">
        <button className="btn" disabled={busy || barrier.state === "Open"} onClick={onOpen}>
          Open
        </button>
        <button className="btn" disabled={busy || barrier.state === "Closed"} onClick={onClose}>
          Close
        </button>
        <button className="btn ghost" disabled={!barrier.broken} onClick={onRepair}>
          Repair
        </button>
      </div>
    </div>
  );
}