import { useEffect, useState } from "react";
import { operatorApi, type OperatorSnapshot } from "../api.operator";
import { useEvents } from "../useEvents";
import { BarrierCard } from "../components/BarrierCard";
import { CarCard } from "../components/CarCard";
import { PenaltyRow } from "../components/PenaltyRow";

export function OperatorDashboard() {
  const [snap, setSnap] = useState<OperatorSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const events = useEvents();

  const refresh = () => {
    operatorApi
      .getSnapshot()
      .then((s) => { setSnap(s); setError(null); })
      .catch((e) => setError(String(e.message ?? e)));
  };

  useEffect(() => { refresh(); }, []);

  // Refresh when a new event lands
  const lastTs = events[0]?.ts;
  useEffect(() => { if (lastTs) refresh(); }, [lastTs]);

  if (error) return <div className="loading">Backend error: {error}</div>;
  if (!snap) return <div className="loading">Loading dashboard…</div>;

  const spotsPark = snap.spots.filter((s) => s.purpose === "Park");
  const occupied = spotsPark.filter((s) => s.detectedCars.length > 0).length;
  const barriersOpen = snap.barriers.filter((b) => b.state === "Open").length;

  return (
    <div className="page">
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label">Cars In Park</div>
          <div className="kpi-value">{snap.cars.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Spots Occupied</div>
          <div className="kpi-value">{occupied} / {spotsPark.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Barriers Open</div>
          <div className="kpi-value">{barriersOpen} / {snap.barriers.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Active Penalties</div>
          <div className="kpi-value red">{snap.penalties.length}</div>
        </div>
      </div>

      <div className="widget-grid">
        <div className="widget col-4">
          <div className="widget-header">
            <div className="widget-title">Barriers</div>
            <div className="widget-sub">{snap.barriers.length}</div>
          </div>
          <div className="widget-body" style={{ display: "grid", gap: 10 }}>
            {snap.barriers.map((b) => (
              <BarrierCard
                key={b.name}
                barrier={b}
                onOpen={() => operatorApi.openBarrier(b.name).then(refresh)}
                onClose={() => operatorApi.closeBarrier(b.name).then(refresh)}
                onRepair={() => operatorApi.repairBarrier(b.name).then(refresh)}
              />
            ))}
          </div>
        </div>

        <div className="widget col-4">
          <div className="widget-header">
            <div className="widget-title">Cars</div>
            <div className="widget-sub">{snap.cars.length}</div>
          </div>
          <div className="widget-body" style={{ display: "grid", gap: 10 }}>
            {snap.cars.length === 0 && <div className="empty">No cars in park</div>}
            {snap.cars.map((c) => (
              <CarCard
                key={c.plate}
                car={c}
                onIssueInvoice={() => operatorApi.issueInvoice(c.plate).then(refresh)}
                onValidatePayment={() => operatorApi.validatePayment(c.plate).then(refresh)}
              />
            ))}
          </div>
        </div>

        <div className="widget col-4">
          <div className="widget-header">
            <div className="widget-title">Zones</div>
            <div className="widget-sub">{snap.zones.length}</div>
          </div>
          <div className="widget-body" style={{ display: "grid", gap: 10 }}>
            {snap.zones.map((z) => (
              <div key={z.name} className="tile">
                <div className="tile-title">
                  <span>{z.name}</span>
                  <span className="pill">{z.risk}</span>
                </div>
                <div className="tile-row">CO: {z.gasCarbonMonoxideLevel} ppm</div>
              </div>
            ))}
          </div>
        </div>

        <div className="widget col-12">
          <div className="widget-header">
            <div className="widget-title">Recent Penalties</div>
            <div className="widget-sub">{snap.penalties.length}</div>
          </div>
          <div className="widget-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="log">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Kind</th>
                    <th>Component</th>
                    <th>Plate</th>
                    <th>Fine</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {snap.penalties.length === 0 && (
                    <tr>
                      <td colSpan={6} className="muted" style={{ textAlign: "center", padding: 24 }}>
                        No penalties
                      </td>
                    </tr>
                  )}
                  {snap.penalties.map((p) => <PenaltyRow key={p.id} penalty={p} />)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="widget col-12">
          <div className="widget-header">
            <div className="widget-title">Live Events</div>
            <div className="widget-sub">{events.length} received</div>
          </div>
          <div className="widget-body">
            <div className="event-log">
              {events.length === 0 && <div className="muted">Waiting for events…</div>}
              {events.slice(0, 40).map((e, i) => (
                <div className="event-row" key={i}>
                  <span className="event-type">{e.type}</span>
                  <span className="event-detail">{JSON.stringify(e).slice(0, 140)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}