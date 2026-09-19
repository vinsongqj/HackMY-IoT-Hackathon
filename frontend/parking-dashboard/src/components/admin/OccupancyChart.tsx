// src/components/admin/OccupancyChart.tsx
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OccupancyPoint } from "../../types";

export function OccupancyChart({ data }: { data: OccupancyPoint[] }) {
  return (
    <div className="chart">
      <h3>Occupancy</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
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
          <Line
            type="monotone"
            dataKey="occupied"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}