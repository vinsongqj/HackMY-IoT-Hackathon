// src/components/admin/RevenueChart.tsx
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenuePoint } from "../../types";

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="chart">
      <h3>Revenue</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c6cff" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#7c6cff" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="ts"
            tickFormatter={(t) => new Date(t).getHours() + "h"}
            stroke="var(--text-dim)"
            tick={{ fill: "var(--text-dim)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            stroke="var(--text-dim)"
            tick={{ fill: "var(--text-dim)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              color: "var(--text)",
            }}
            labelStyle={{ color: "var(--text-dim)" }}
            itemStyle={{ color: "var(--text)" }}
            labelFormatter={(t) => new Date(t).toLocaleString()}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#7c6cff"
            fill="url(#rev)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}