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
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6c5ce7" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#6c5ce7" stopOpacity={0.03} />
          </linearGradient>
        </defs>
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
          formatter={(value: number) => [`RM ${value.toFixed(2)}`, "Amount"]}
        />
        <Area type="monotone" dataKey="amount" stroke="#6c5ce7" fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}