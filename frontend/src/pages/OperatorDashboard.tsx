import { useEffect, useRef, useState } from "react";
import { operatorApi, type OperatorSnapshot } from "../api.operator";
import { useEvents } from "../useEvents";
import { BarrierCard } from "../components/operator/BarrierCard";
import { SpotCard } from "../components/operator/SpotCard";
import { CarCard } from "../components/operator/CarCard";
import { FanCard } from "../components/operator/FanCard";
import { LightCard } from "../components/operator/LightCard";
import { ZoneCard } from "../components/operator/ZoneCard";
import { PenaltyRow } from "../components/operator/PenaltyRow";

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

  // Live events can arrive many times per second under load; refetching the full
  // snapshot (7 backend calls) on every single one causes a reload storm. Throttle
  // to at most one refresh/second, with a trailing call so the last event still lands.
  const throttleRef = useRef<{ timer: number | null; pending: boolean }>({ timer: null, pending: false });
  useEffect(() => {
    return () => {
      if (throttleRef.current.timer) clearTimeout(throttleRef.current.timer);
    };
  }, []);

  const lastTs = events[0]?.ts;
  useEffect(() => {
    if (!lastTs) return;
    const state = throttleRef.current;
    if (state.timer) {
      state.pending = true;
      return;
    }
    refresh();
    state.timer = window.setTimeout(() => {
      state.timer = null;
      if (state.pending) {
        state.pending = false;
        refresh();
      }
    }, 1000);
  }, [lastTs]);

  if (error) return <div className="loading">Backend error: {error}</div>;
  if (!snap) return <div className="loading">Loading dashboard…</div>;

  const spotsPark = snap.spots.filter((s) => s.purpose === "Park");
  const occupied = spotsPark.filter((s) => s.detectedCars > 0).length;
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
          <div className="kpi-value">{snap.penalties.length}</div>
        </div>
      </div>

      <div className="widget-grid">
        <div className="widget col-3">
          <div className="widget-header">
            <div className="widget-title">Zones</div>
            <div className="widget-sub">{snap.zones.length}</div>
          </div>
          <div className="widget-body" style={{ display: "grid", gap: 10 }}>
            {snap.zones.map((z) => <ZoneCard key={z.name} zone={z} />)}
          </div>
        </div>

        <div className="widget col-3">
          <div className="widget-header">
            <div className="widget-title">Barriers</div>
            <div className="widget-sub">{snap.barriers.length}</div>
          </div>
          <div className="widget-body" style={{ display: "grid", gap: 10 }}>
            {snap.barriers.map((b) => (
              <BarrierCard
                key={b.name}
                barrier={b}
                onOpen={(n) => operatorApi.openBarrier(n).then(refresh)}
                onClose={(n) => operatorApi.closeBarrier(n).then(refresh)}
                onRepair={(n) => operatorApi.repairBarrier(n).then(refresh)}
              />
            ))}
          </div>
        </div>

        <div className="widget col-3">
          <div className="widget-header">
            <div className="widget-title">Exhaust Fans</div>
            <div className="widget-sub">{snap.fans.length}</div>
          </div>
          <div className="widget-body" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 10,
          }}>
            {snap.fans.length === 0 && <div className="empty">No fans</div>}
            {snap.fans.map((f) => (
              <FanCard
                key={f.name}
                fan={f}
                onOn={(n) => operatorApi.turnFanOn(n).then(refresh)}
                onOff={(n) => operatorApi.turnFanOff(n).then(refresh)}
                onRepair={(n) => operatorApi.repairFan(n).then(refresh)}
              />
            ))}
          </div>
        </div>

        <div className="widget col-3">
          <div className="widget-header">
            <div className="widget-title">Lights</div>
            <div className="widget-sub">{snap.lights.length}</div>
          </div>
          <div className="widget-body" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 10,
          }}>
            {snap.lights.map((l) => (
              <LightCard
                key={l.name}
                light={l}
                onOn={(n) => operatorApi.turnLightOn(n).then(refresh)}
                onOff={(n) => operatorApi.turnLightOff(n).then(refresh)}
              />
            ))}
          </div>
        </div>

        <div className="widget col-6">
          <div className="widget-header">
            <div className="widget-title">Parking Spots</div>
            <div className="widget-sub">{occupied}/{spotsPark.length} occupied</div>
          </div>
          <div className="widget-body scroll" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 10,
          }}>
            {snap.spots.map((s) => (
              <SpotCard
                key={s.name}
                spot={s}
                onRepair={(n) => operatorApi.repairSpot(n).then(refresh)}
              />
            ))}
          </div>
        </div>

        <div className="widget col-6">
          <div className="widget-header">
            <div className="widget-title">Cars</div>
            <div className="widget-sub">{snap.cars.length}</div>
          </div>
          <div className="widget-body scroll" style={{ display: "grid", gap: 10 }}>
            {snap.cars.length === 0 && <div className="empty">No cars in park</div>}
            {snap.cars.map((c) => (
              <CarCard
                key={c.plate}
                car={c}
                onIssueInvoice={(p) => operatorApi.issueInvoice(p).then(refresh)}
                onValidatePayment={(p) => operatorApi.validatePayment(p).then(refresh)}
                onSendExit={(p) => operatorApi.sendCar(p, "leavepark").then(refresh)}
              />
            ))}
          </div>
        </div>

        <div className="widget col-12">
          <div className="widget-header">
            <div className="widget-title">Recent Penalties</div>
            <div className="widget-sub">{snap.penalties.length}</div>
          </div>
          <div className="widget-body" style={{ padding: 0 }}>
            <div className="table-wrap scroll">
              <table className="log">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Component</th>
                    <th>Plate</th>
                    <th>Fine</th>
                    <th>Reason</th>
                    <th>Time</th>
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