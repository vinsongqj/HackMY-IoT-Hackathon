import { useEffect, useRef, useState } from "react";
import { adminApi, type LogQuery } from "../api.admin";
import type { AdminStats, RequestLog, RevenuePoint, OccupancyPoint } from "../types";
import { useEvents } from "../useEvents";
import { StatCard } from "../components/admin/StatCard";
import { LogTable } from "../components/admin/LogTable";
import { RevenueChart } from "../components/admin/RevenueChart";
import { OccupancyChart } from "../components/admin/OccupancyChart";

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const events = useEvents();

  const refresh = () => {
    const from = new Date(Date.now() - 24 * 3600_000).toISOString();
    const to = new Date().toISOString();

    adminApi.getStats().then((s) => { setStats(s); setError(null); }).catch((e) => setError(String(e.message)));
    adminApi.getRevenueSeries({ from, to, bucket: "15min" }).then(setRevenue).catch(() => {});
    adminApi.getOccupancySeries({ from, to, bucket: "15min" }).then(setOccupancy).catch(() => {});

    const q: LogQuery = { page: 1, pageSize: 50 };
    adminApi.getLogs(q).then((p) => setLogs(p.items)).catch(() => {});
  };

  useEffect(() => { refresh(); }, []);

  // Same throttled live-refresh as the Operator dashboard, driven by the same
  // /ws/events stream, so Admin's numbers never drift stale behind Operator's.
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

  if (error) return <div className="loading">Admin backend not ready — {error}</div>;
  if (!stats) return <div className="loading">Loading admin stats…</div>;

  return (
    <div className="page">
      <div className="kpi-row">
        <StatCard label="Total Revenue"    value={`RM ${stats.revenue.total.toFixed(2)}`} />
        <StatCard label="Today's Revenue"  value={`RM ${stats.revenue.today.toFixed(2)}`} tone="green" />
        <StatCard
          label="Current Occupancy"
          value={`${stats.occupancy.current}/${stats.occupancy.capacity}`}
          sub={`Peak today: ${stats.occupancy.peakToday}`}
          tone="blue"
        />
        <StatCard label="Today's Arrivals" value={stats.occupancy.today} />
        <StatCard label="This Week"        value={`RM ${stats.revenue.thisWeek.toFixed(2)}`} />
        <StatCard label="This Month"       value={`RM ${stats.revenue.thisMonth.toFixed(2)}`} />
        <StatCard label="Penalties"        value={stats.penalties.count} tone="red" />
        <StatCard label="Losses"           value={`RM ${stats.penalties.totalAmount.toFixed(2)}`} tone="red" />
      </div>

      <div className="widget-grid">
        <div className="widget col-8">
          <div className="widget-header">
            <div className="widget-title">Revenue (24h)</div>
          </div>
          <div className="widget-body"><RevenueChart data={revenue} /></div>
        </div>

        <div className="widget col-4">
          <div className="widget-header">
            <div className="widget-title">Occupancy (24h)</div>
          </div>
          <div className="widget-body"><OccupancyChart data={occupancy} /></div>
        </div>

        <div className="widget col-12">
          <div className="widget-header">
            <div className="widget-title">Request Logs</div>
            <div className="widget-sub">{logs.length} entries</div>
          </div>
          <div className="widget-body" style={{ padding: 0 }}>
            <LogTable logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}