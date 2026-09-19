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
          tickFormatter={(t) => new Date(t).getHours() + "h"}
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
        <Area type="monotone" dataKey="amount" stroke="#6c5ce7" fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}