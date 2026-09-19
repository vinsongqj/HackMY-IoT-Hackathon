import { http } from "./api.http";
import type {
  AdminStats, LogPage, LogType,
  RevenuePoint, OccupancyPoint,
} from "./types";

export interface LogQuery {
  type?: LogType;
  from?: string;
  to?: string;
  plate?: string;
  component?: string;
  page?: number;
  pageSize?: number;
}

export const adminApi = {
  getStats: (params?: { date?: string }) => {
    const qs = params?.date ? `?date=${encodeURIComponent(params.date)}` : "";
    return http<AdminStats>(`/api/admin/stats${qs}`);
  },

  getLogs: (query: LogQuery = {}) => {
    const qs = new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return http<LogPage>(`/api/admin/logs${qs ? `?${qs}` : ""}`);
  },

  getRevenueSeries: (params: { from: string; to: string; bucket?: "hour" | "day" }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return http<RevenuePoint[]>(`/api/admin/revenue?${qs}`);
  },

  getOccupancySeries: (params: { from: string; to: string; bucket?: "hour" | "day" }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return http<OccupancyPoint[]>(`/api/admin/occupancy?${qs}`);
  },
};