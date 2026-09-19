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
  { value: "evening",   label: "Evening (18–