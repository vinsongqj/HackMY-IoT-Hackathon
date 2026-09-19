// src/components/admin/LogTable.tsx
import { useMemo, useState } from "react";
import type { RequestLog, LogType } from "../../types";
import { Badge } from "../ui/Badge";

const toneByType: Record<string, "green" | "red" | "blue" | "orange" | "gray" | "purple"> = {
  Arrival: "blue",
  Departure: "gray",
  Payment: "green",
  Penalty: "red",
  ComponentBroken: "red",
  MaintenanceRequest: "orange",
  MaintenanceComplete: "green",
  GateAction: "purple",
};

type Range = "all" | "today" | "7d" | "30d";
type TimeOfDay = "all" | "morning" | "afternoon" | "evening" | "night";
type Sort = "newest" | "oldest" | "amountHigh" | "amountLow";

const RANGES: { value: Range; label: string }[] = [
  { value: "all",   label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d",    label: "Last 7 days" },
  { value: "30d",   label: "Last 30 days" },
];

const TIMES: { value: TimeOfDay; label: string }[] = [
  { value: "all",       label: "Any time" },
  { value: "morning",   label: "Morning (6–12)" },
  { value: "afternoon", label: "Afternoon (12–18)" },
  { value: "evening",   label: "Evening (18–22)" },
  { value: "night",     label: "Night (22–6)" },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest",    label: "Newest first" },
  { value: "oldest",    label: "Oldest first" },
  { value: "amountHigh",label: "Amount: high → low" },
  { value: "amountLow", label: "Amount: low → high" },
];

const TYPES: { value: LogType | "All"; label: string }[] = [
  { value: "All",                label: "All types" },
  { value: "Arrival",            label: "Arrivals" },
  { value: "Departure",          label: "Departures" },
  { value: "Payment",            label: "Payments" },
  { value: "Penalty",            label: "Penalties" },
  { value: "ComponentBroken",    label: "Broken" },
  { value: "MaintenanceRequest", label: "Maintenance" },
  { value: "GateAction",         label: "Gate actions" },
];

function isWithinRange(ts: string, range: Range): boolean {
  if (range === "all") return true;
  const t = new Date(ts).getTime();
  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return t >= start.getTime();
  }
  const days = range === "7d" ? 7 : 30;
  return t >= Date.now() - days * 24 * 3600_000;
}

function isWithinTimeOfDay(ts: string, tod: TimeOfDay): boolean {
  if (tod === "all") return true;
  const h = new Date(ts).getHours(); // 0–23
  if (tod === "morning")   return h >= 6  && h < 12;
  if (tod === "afternoon") return h >= 12 && h < 18;
  if (tod === "evening")   return h >= 18 && h < 22;
  // night: 22–23 and 0–5
  return h >= 22 || h < 6;
}

export function LogTable({ logs }: { logs: RequestLog[] }) {
  const [query, setQuery]     = useState("");
  const [type, setType]       = useState<LogType | "All">("All");
  const [range, setRange]     = useState<Range>("all");
  const [tod, setTod]         = useState<TimeOfDay>("all");
  const [sort, setSort]       = useState<Sort>("newest");
  const [priceMin, setMin]    = useState<string>("");
  const [priceMax, setMax]    = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = priceMin === "" ? -Infinity : Number(priceMin);
    const max = priceMax === "" ?  Infinity : Number(priceMax);

    const out = logs.filter((l) => {
      if (type !== "All" && l.type !== type) return false;
      if (!isWithinRange(l.timestamp, range)) return false;
      if (!isWithinTimeOfDay(l.timestamp, tod)) return false;

      // price range only applies to rows that have an amount
      if (l.amount != null) {
        if (l.amount < min || l.amount > max) return false;
      } else if (priceMin !== "" || priceMax !== "") {
        // If user set a price range, hide amount-less rows
        return false;
      }

      if (!q) return true;
      return (
        (l.plate ?? "").toLowerCase().includes(q) ||
        (l.component ?? "").toLowerCase().includes(q) ||
        l.type.toLowerCase().includes(q) ||
        JSON.stringify(l.metadata ?? {}).toLowerCase().includes(q)
      );
    });

    out.sort((a, b) => {
      switch (sort) {
        case "newest":     return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case "oldest":     return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case "amountHigh": return (b.amount ?? -1) - (a.amount ?? -1);
        case "amountLow":  return (a.amount ?? Infinity) - (b.amount ?? Infinity);
      }
    });

    return out;
  }, [logs, query, type, range, tod, sort, priceMin, priceMax]);

  const hasFilters =
    query !== "" ||
    type !== "All" ||
    range !== "all" ||
    tod !== "all" ||
    sort !== "newest" ||
    priceMin !== "" ||
    priceMax !== "";

  const clear = () => {
    setQuery("");
    setType("All");
    setRange("all");
    setTod("all");
    setSort("newest");
    setMin("");
    setMax("");
  };

  return (
    <div className="log-panel">
      {/* ---------- Filter bar ---------- */}
      <div className="log-filters">
        <div className="log-search">
          <span className="log-search-icon">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plate, component, type…"
          />
          {query && (
            <button
              className="log-search-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <select
          className="log-select"
          value={type}
          onChange={(e) => setType(e.target.value as LogType | "All")}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select
          className="log-select"
          value={range}
          onChange={(e) => setRange(e.target.value as Range)}
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <select
          className="log-select"
          value={tod}
          onChange={(e) => setTod(e.target.value as TimeOfDay)}
        >
          {TIMES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Price range */}
        <div className="log-price">
          <span className="log-price-icon">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={priceMin}
            onChange={(e) => setMin(e.target.value)}
            placeholder="min"
            min={0}
          />
          <span className="log-price-dash">–</span>
          <input
            type="number"
            inputMode="decimal"
            value={priceMax}
            onChange={(e) => setMax(e.target.value)}
            placeholder="max"
            min={0}
          />
        </div>

        <select
          className="log-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button className="btn ghost" onClick={clear}>
            Clear
          </button>
        )}

        <div className="log-count">
          {filtered.length} of {logs.length}
        </div>
      </div>

      {/* ---------- Table ---------- */}
      <div className="table-wrap">
        <table className="log">
          <thead>
            <tr>
              <th style={{ width: 160 }}>Time</th>
              <th style={{ width: 140 }}>Type</th>
              <th style={{ width: 130 }}>Plate</th>
              <th style={{ width: 130 }}>Component</th>
              <th style={{ width: 110 }}>Amount</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: "center", padding: 32 }}>
                  {hasFilters ? "No matching logs" : "No logs yet"}
                </td>
              </tr>
            )}
            {filtered.map((l) => (
              <tr key={l.id}>
                <td className="mono">{new Date(l.timestamp).toLocaleString()}</td>
                <td>
                  <Badge tone={toneByType[l.type] ?? "gray"}>{l.type}</Badge>
                </td>
                <td className="mono">{l.plate ?? "—"}</td>
                <td className="mono">{l.component ?? "—"}</td>
                <td>{l.amount != null ? `$${l.amount.toFixed(2)}` : "—"}</td>
                <td className="muted" style={{ fontSize: 11 }}>
                  {Object.keys(l.metadata ?? {}).length > 0
                    ? Object.entries(l.metadata)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(" · ")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}