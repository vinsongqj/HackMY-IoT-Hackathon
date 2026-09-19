// src/pages/AdminDashboard.tsx
import { useEffect, useState } from "react";
import * as admin from "../api.admin";
import type { AdminStats, RequestLog } from "../types";

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<RequestLog[]>([]);

  useEffect(() => {
    admin.getStats().then(setStats);
    admin.getLogs({ page: 1, pageSize: 50 }).then(p => setLogs(p.items));
  }, []);

  if (!stats) return <div>Loading…</div>;

  return (
    <div>
      <StatCard label="Total Revenue"       value={`$${stats.revenue.total.toFixed(2)}`} />
      <StatCard label="Today's Revenue"     value={`$${stats.revenue.today.toFixed(2)}`} />
      <StatCard label="Current Occupancy"   value={`${stats.occupancy.current}/${stats.occupancy.capacity}`} />
      <StatCard label="Today's Arrivals"    value={stats.occupancy.today} />
      <StatCard label="Peak Today"          value={stats.occupancy.peakToday} />
      <StatCard label="Penalties (count)"   value={stats.penalties.count} />
      <StatCard label="Penalties ($)"       value={`$${stats.penalties.totalAmount.toFixed(2)}`} />

      <LogTable logs={logs} />
    </div>
  );
}