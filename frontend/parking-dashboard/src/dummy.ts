// src/dummy.ts
import type { OperatorSnapshot } from "./api.operator";
import type { AdminStats, RequestLog, RevenuePoint, OccupancyPoint } from "./types";

const now = Date.now();
const iso = (offsetMin = 0) => new Date(now - offsetMin * 60_000).toISOString();

// ---------- OPERATOR ----------
export const DUMMY_OPERATOR: OperatorSnapshot = {
  barriers: [
    { name: "gate0", zoneParent: "",      state: "Open",   broken: false, isUnderMaintenance: false },
    { name: "gate1", zoneParent: "ZONE1", state: "Closed", broken: false, isUnderMaintenance: false },
    { name: "gate2", zoneParent: "ZONE2", state: "Open",   broken: true,  isUnderMaintenance: false },
  ],
  spots: [
    { name: "S150", purpose: "Park",      parkingForCarType: "Any",        zoneParent: "ZONE1", detectedCars: [],          broken: false, isUnderMaintenance: false },
    { name: "S151", purpose: "Park",      parkingForCarType: "Electric",   zoneParent: "ZONE1", detectedCars: ["ABC123"],  broken: false, isUnderMaintenance: false },
    { name: "S152", purpose: "Park",      parkingForCarType: "Accessible", zoneParent: "ZONE2", detectedCars: [],          broken: false, isUnderMaintenance: false },
    { name: "S153", purpose: "Park",      parkingForCarType: "Any",        zoneParent: "ZONE2", detectedCars: ["XYZ999"],  broken: true,  isUnderMaintenance: false },
    { name: "E1",   purpose: "EntrySpot", parkingForCarType: "Any",        zoneParent: "ZONE1", detectedCars: [],          broken: false, isUnderMaintenance: false },
    { name: "X1",   purpose: "ExitSpot",  parkingForCarType: "Any",        zoneParent: "ZONE1", detectedCars: [],          broken: false, isUnderMaintenance: false },
  ],
  cars: [
    {
      plate: "ABC123", type: "Electric", currentSpot: "S151", parkedAt: iso(42),
      parkingDurationMinutes: 42, invoice: null, paymentStatus: "None",
    },
    {
      plate: "XYZ999", type: "Fuel", currentSpot: "S153", parkedAt: iso(15),
      parkingDurationMinutes: 15, invoice: null, paymentStatus: "None",
    },
    {
      plate: "DEF456", type: "Fuel", currentSpot: "X1", parkedAt: iso(90),
      parkingDurationMinutes: 90,
      invoice: { plate: "DEF456", parkingCost: 90, chargingCost: 0, total: 90, issuedAt: iso(2), paidAt: iso(1) },
      paymentStatus: "Paid",
    },
  ],
  fans: [
    { name: "fan0", zoneParent: "ZONE1", isOn: true,  broken: false, isUnderMaintenance: false },
    { name: "fan1", zoneParent: "ZONE2", isOn: false, broken: false, isUnderMaintenance: true, maintenanceEtaSeconds: 30 },
  ],
  lights: [
    { name: "t_0", group: "G1", zoneParent: "ZONE1", isOn: true  },
    { name: "t_1", group: "G1", zoneParent: "ZONE1", isOn: true  },
    { name: "t_2", group: "G2", zoneParent: "ZONE2", isOn: false },
    { name: "t_3", group: "G2", zoneParent: "ZONE2", isOn: false },
  ],
  zones: [
    { name: "ZONE1", gasCarbonMonoxideLevel: 12, risk: "Safe"     },
    { name: "ZONE2", gasCarbonMonoxideLevel: 58, risk: "Moderate" },
    { name: "ZONE3", gasCarbonMonoxideLevel: 92, risk: "High"     },
  ],
  penalties: [
    { id: "p1", type: "OccupiedSpot", component: "S151", plate: "XYZ999",
      fineAmount: 50, reason: "Attempted to park in occupied spot", occurredAt: iso(8) },
    { id: "p2", type: "ChargedNonElectric", component: "X1", plate: "DEF456",
      fineAmount: 25, reason: "Charging applied to non-EV", occurredAt: iso(3) },
  ],
};

// ---------- ADMIN ----------
export const DUMMY_ADMIN_STATS: AdminStats = {
  revenue: {
    total:     1240.50,
    today:     320.00,
    thisWeek:  890.25,
    thisMonth: 4230.75,
  },
  occupancy: {
    current:   12,
    capacity:  20,
    today:     27,
    peakToday: 14,
  },
  penalties: {
    count: 2,
    totalAmount: 75,
    byType: {
      WrongSpotType: 0, OccupiedSpot: 1, ChargedTwice: 0, ChargedNonElectric: 1,
      OperatedBroken: 0, OperatedUnderMaintenance: 0, RepairedInUse: 0,
      InvalidPayment: 0, MissedExitPayment: 0,
    },
  },
};

export const DUMMY_LOGS: RequestLog[] = [
  { id: "l1", type: "Arrival",   timestamp: iso(120), plate: "ABC123", component: "E1",   amount: null,  metadata: {} },
  { id: "l2", type: "Payment",   timestamp: iso(90),  plate: "DEF456", component: "X1",   amount: 90,    metadata: {} },
  { id: "l3", type: "Penalty",   timestamp: iso(8),   plate: "XYZ999", component: "S151", amount: 50,    metadata: { reason: "Occupied spot" } },
  { id: "l4", type: "Departure", timestamp: iso(5),   plate: "GHI789", component: "X1",   amount: null,  metadata: {} },
  { id: "l5", type: "Arrival",   timestamp: iso(3),   plate: "XYZ999", component: "E1",   amount: null,  metadata: {} },
  { id: "l6", type: "GateAction",timestamp: iso(2),   plate: null,     component: "gate1",amount: null,  metadata: { action: "open" } },
];

export const DUMMY_REVENUE: RevenuePoint[] = Array.from({ length: 24 }, (_, i) => ({
  ts: new Date(now - (23 - i) * 3600_000).toISOString(),
  amount: Math.round(20 + Math.random() * 60),
}));

export const DUMMY_OCCUPANCY: OccupancyPoint[] = Array.from({ length: 24 }, (_, i) => ({
  ts: new Date(now - (23 - i) * 3600_000).toISOString(),
  occupied: Math.round(6 + Math.random() * 12),
}));