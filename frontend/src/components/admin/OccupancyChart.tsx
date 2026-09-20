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
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <XAxis
          dataKey="ts"
          tickFormatter={(t) =>
            new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
          // With 15-minute buckets a 24h window is ~96 points - the default category
          // axis draws one tick per point, which overlaps into an unreadable smear.
          // Thin it to roughly 8 evenly-spaced labels regardless of bucket size.
          interval={Math.max(0, Math.ceil(data.length / 8) - 1)}
          stroke="#8a92a6"
          tick={{ fill: "#8a92a6", fontSize: 11 }}
          axisLine={{ stroke: "#e6e8f0" }}
          tickLine={false}
        />
        <YAxis
          stroke="#8a92a6"
          tick={{ fill: "#8a92a6", fontSize: 11 }}
          axisLine={{ stroke: "#e6e8f0" }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e6e8f0",
            borderRadius: 10,
            color: "#1a1d2b",
          }}
          labelStyle={{ color: "#7d829a" }}
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
  );
}