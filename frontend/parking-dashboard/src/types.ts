// src/types.ts

// ---------- Component base ----------
export interface ComponentState {
  broken: boolean;
  isUnderMaintenance: boolean;
  maintenanceEtaSeconds?: number;
}

// ---------- Barrier ----------
export type BarrierState = "Open" | "Closed" | "Opening" | "Closing";

export interface Barrier extends ComponentState {
  name: string;
  zoneParent: string;
  state: BarrierState;
}

// ---------- Parking spot ----------
export type SpotPurpose = "Park" | "EntrySpot" | "ExitSpot";
export type SpotCarType = "Any" | "Electric" | "Accessible";

export interface ParkingSpot extends ComponentState {
  name: string;
  purpose: SpotPurpose;
  parkingForCarType: SpotCarType;
  zoneParent: string;
  detectedCars: string[];
}

// ---------- Car ----------
export type CarType = "Electric" | "Fuel";

export type PaymentStatus =
  | "None"
  | "Requested"
  | "Paid"
  | "Validated"
  | "Failed";

export interface Invoice {
  plate: string;
  parkingCost: number;
  chargingCost: number;
  total: number;
  issuedAt: string;
  paidAt: string | null;
}

export interface Car {
  plate: string;
  type: CarType;
  currentSpot: string | null;
  parkedAt: string | null;
  parkingDurationMinutes: number;
  invoice: Invoice | null;
  paymentStatus: PaymentStatus;
}

// ---------- Exhaust fan ----------
export interface ExhaustFan extends ComponentState {
  name: string;
  zoneParent: string;
  isOn: boolean;
}

// ---------- Light ----------
export interface Light {
  name: string;
  group: string;
  zoneParent: string;
  isOn: boolean;
}

// ---------- Zone ----------
export type RiskLevel = "Safe" | "Low" | "Moderate" | "High";

export interface Zone {
  name: string;
  gasCarbonMonoxideLevel: number;
  risk: RiskLevel;
}

// ---------- Penalty ----------
export type PenaltyType =
  | "WrongSpotType"
  | "OccupiedSpot"
  | "ChargedTwice"
  | "ChargedNonElectric"
  | "OperatedBroken"
  | "OperatedUnderMaintenance"
  | "RepairedInUse"
  | "InvalidPayment"
  | "MissedExitPayment";

export interface Penalty {
  id: string;
  type: PenaltyType;
  component: string;
  plate: string | null;
  fineAmount: number;
  reason: string;
  occurredAt: string;
}

// ---------- Admin stats ----------
export interface AdminStats {
  revenue: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  occupancy: {
    current: number;
    capacity: number;
    today: number;
    peakToday: number;
  };
  penalties: {
    count: number;
    totalAmount: number;
    byType: Record<PenaltyType, number>;
  };
}

// ---------- Logs ----------
export type LogType =
  | "Arrival"
  | "Departure"
  | "Payment"
  | "Penalty"
  | "MaintenanceRequest"
  | "MaintenanceComplete"
  | "ComponentBroken"
  | "GateAction";

export interface RequestLog {
  id: string;
  type: LogType;
  timestamp: string;
  plate: string | null;
  component: string | null;
  amount: number | null;
  metadata: Record<string, unknown>;
}

export interface LogPage {
  items: RequestLog[];
  page: number;
  pageSize: number;
  total: number;
}

// ---------- Charts ----------
export interface RevenuePoint   { ts: string; amount: number }
export interface OccupancyPoint { ts: string; occupied: number }

// ---------- WebSocket events ----------
export type SimEvent =
  | { type: "CarIn";              plate: string; spot: string; carType: CarType; plannedMinutes: number; ts: number }
  | { type: "CarOut";             plate: string; spot: string; ts: number }
  | { type: "CarParked";          plate: string; spot: string; ts: number }
  | { type: "CarLeftSpot";        plate: string; spot: string; ts: number }
  | { type: "GateOpened";         name: string; ts: number }
  | { type: "GateClosed";         name: string; ts: number }
  | { type: "ComponentBroken";    name: string; componentType: string; problem: string; ts: number }
  | { type: "ComponentRepaired";  name: string; ts: number }
  | { type: "PaymentReceived";    plate: string; amount: number; ts: number }
  | { type: "PaymentFailed";      plate: string; reason: string; ts: number }
  | { type: "Penalty";            penalty: Penalty; ts: number }
  | { type: "Co2Changed";         zone: string; level: number; risk: RiskLevel; ts: number }
  | { type: "MaintenanceStarted"; name: string; etaSeconds: number; ts: number }
  | { type: "MaintenanceFinished";name: string; ts: number };