// src/pages/OperatorDashboard.tsx
import { useEffect, useState } from "react";
import * as op from "../api.operator";
import { useEvents } from "../useEvents";
import type { OperatorSnapshot } from "../api.operator";

export function OperatorDashboard() {
  const [snap, setSnap] = useState<OperatorSnapshot | null>(null);
  const events = useEvents();

  const refresh = () => op.getSnapshot().then(setSnap);

  useEffect(() => { refresh(); }, []);

  // Refetch on every meaningful event
  const lastTs = events[0]?.ts;
  useEffect(() => { if (lastTs) refresh(); }, [lastTs]);

  if (!snap) return <div>Loading…</div>;

  return (
    <div>
      <section>
        <h2>Barriers</h2>
        {snap.barriers.map(b => (
          <BarrierCard key={b.name} barrier={b}
            onOpen={() => op.openBarrier(b.name).then(refresh)}
            onClose={() => op.closeBarrier(b.name).then(refresh)}
            onRepair={() => op.repairBarrier(b.name).then(refresh)} />
        ))}
      </section>

      <section>
        <h2>Cars</h2>
        {snap.cars.map(c => (
          <CarCard key={c.plate} car={c}
            onIssueInvoice={() => op.issueInvoice(c.plate).then(refresh)}
            onValidatePayment={() => op.validatePayment(c.plate).then(refresh)} />
        ))}
      </section>

      <section>
        <h2>Penalties</h2>
        {snap.penalties.map(p => <PenaltyRow key={p.id} penalty={p} />)}
      </section>
    </div>
  );
}