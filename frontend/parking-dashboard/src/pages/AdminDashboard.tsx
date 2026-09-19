import { useEffect, useState } from "react";
import { adminApi, type LogQuery } from "../api.admin";
import type { AdminStats, RequestLog, RevenuePoint, OccupancyPoint } from "../types";
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

  useEffect(() => {
    const from = new Date(Date.now() - 24 * 3600_000).toISOString();
    const to = new Date().toISOString();

    adminApi.getStats().then(setStats).catch((e) => setError(String(e.message)));
    adminApi.getRevenueSeries({ from, to, bucket: "hour" }).then(setRevenue).catch(() => {});
    adminApi.getOccupancySeries({ from, to, bucket: "hour" }).then(setOccupancy).catch(() => {});

    const q: LogQuery = { page: 1, pageSize: 50 };
    adminApi.getLogs(q).then((p) => setLogs(p.items)).catch(() => {});
  }, []);

  if (error) return <div className="loading">Admin backend not ready — {error}</div>;
  if (!stats) return <div className="loading">Loading admin stats…</div>;

  return (
    <div className="page">
      <div className="kpi-row">
        <StatCard label="Total Revenue"    value={`$${stats.revenue.total.toFixed(2)}`} />
        <StatCard label="Today's Revenue"  value={`$${stats.revenue.today.toFixed(2)}`} tone="green" />
        <StatCard
          label="Current Occupancy"
          value={`${stats.occupancy.current}/${stats.occupancy.capacity}`}
          sub={`Peak today: ${stats.occupancy.peakToday}`}
          tone="blue"
        />
        <StatCard label="Today's Arrivals" value={stats.occupancy.today} />
        <StatCard label="This Week"        value={`$${stats.revenue.thisWeek.toFixed(2)}`} />
        <StatCard label="This Month"       value={`$${stats.revenue.thisMonth.toFixed(2)}`} />
        <StatCard label="Penalties"        value={stats.penalties.count} tone="red" />
        <StatCard label="Losses"           value={`$${stats.penalties.totalAmount.toFixed(2)}`} tone="red" />
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