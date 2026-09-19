// src/App.tsx
import { useEffect, useState } from "react";
import { operatorApi, type OperatorSnapshot } from "./api.operator";
import { useEvents } from "./useEvents";

export default function App() {
  const [snap, setSnap] = useState<OperatorSnapshot | null>(null);
  const events = useEvents();

  const refresh = () => operatorApi.getSnapshot().then(setSnap);

  useEffect(() => { refresh(); }, []);

  const lastTs = events[0]?.ts;
  useEffect(() => { if (lastTs) refresh(); }, [lastTs]);

  if (!snap) return <div>Loading…</div>;

  return (
    <div>
      <h1>Operator Dashboard</h1>
      <p>{snap.barriers.length} barriers · {snap.spots.length} spots · {snap.cars.length} cars</p>
    </div>
  );
}