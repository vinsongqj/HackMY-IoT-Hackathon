// src/api.operator.ts
import { http } from "./api.http";
import type {
  Barrier, ParkingSpot, Car, ExhaustFan, Light, Zone,
  Penalty, Invoice, PenaltyType,
} from "./types";

export interface OperatorSnapshot {
  barriers: Barrier[];
  spots: ParkingSpot[];
  cars: Car[];
  fans: ExhaustFan[];
  lights: Light[];
  zones: Zone[];
  penalties: Penalty[];
}

export const operatorApi = {
  // Snapshot
  getSnapshot: () => http<OperatorSnapshot>("/api/operator/state"),

  // Barriers
  listBarriers:  () => http<Barrier[]>("/api/operator/barriers"),
  openBarrier:   (name: string) => http<void>(`/api/operator/barriers/${encodeURIComponent(name)}/open`,   { method: "POST" }),
  closeBarrier:  (name: string) => http<void>(`/api/operator/barriers/${encodeURIComponent(name)}/close`,  { method: "POST" }),
  repairBarrier: (name: string) => http<void>(`/api/operator/barriers/${encodeURIComponent(name)}/repair`, { method: "POST" }),

  // Spots
  listSpots:  () => http<ParkingSpot[]>("/api/operator/spots"),
  repairSpot: (name: string) => http<void>(`/api/operator/spots/${encodeURIComponent(name)}/repair`, { method: "POST" }),

  // Cars
  listCars:        () => http<Car[]>("/api/operator/cars"),
  getCar:          (plate: string) => http<Car>(`/api/operator/cars/${encodeURIComponent(plate)}`),
  issueInvoice:    (plate: string) => http<Invoice>(`/api/operator/cars/${encodeURIComponent(plate)}/invoice`, { method: "POST" }),
  requestPayment:  (plate: string, parkingCost: number, chargingCost: number) => {
    const qs = new URLSearchParams({ parkingCost: String(parkingCost), chargingCost: String(chargingCost) });
    return http<void>(`/api/operator/cars/${encodeURIComponent(plate)}/charge?${qs}`, { method: "POST" });
  },
  validatePayment: (plate: string) => http<void>(`/api/operator/cars/${encodeURIComponent(plate)}/validate-payment`, { method: "POST" }),
  sendCar:         (plate: string, destination: string) =>
    http<void>(`/api/operator/cars/${encodeURIComponent(plate)}/goto/${encodeURIComponent(destination)}`, { method: "POST" }),

  // Fans
  listFans:   () => http<ExhaustFan[]>("/api/operator/fans"),
  turnFanOn:  (name: string) => http<void>(`/api/operator/fans/${encodeURIComponent(name)}/on`,     { method: "POST" }),
  turnFanOff: (name: string) => http<void>(`/api/operator/fans/${encodeURIComponent(name)}/off`,    { method: "POST" }),
  repairFan:  (name: string) => http<void>(`/api/operator/fans/${encodeURIComponent(name)}/repair`, { method: "POST" }),

  // Lights
  listLights:        () => http<Light[]>("/api/operator/lights"),
  turnLightOn:       (name: string)  => http<void>(`/api/operator/lights/${encodeURIComponent(name)}/on`,         { method: "POST" }),
  turnLightOff:      (name: string)  => http<void>(`/api/operator/lights/${encodeURIComponent(name)}/off`,        { method: "POST" }),
  turnLightGroupOn:  (group: string) => http<void>(`/api/operator/lights/group/${encodeURIComponent(group)}/on`,  { method: "POST" }),
  turnLightGroupOff: (group: string) => http<void>(`/api/operator/lights/group/${encodeURIComponent(group)}/off`, { method: "POST" }),

  // Penalties + zones
  listPenalties: (params?: { from?: string; to?: string; type?: PenaltyType }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v != null) as [string, string][]
    ).toString();
    return http<Penalty[]>(`/api/operator/penalties${qs ? `?${qs}` : ""}`);
  },
  listZones: () => http<Zone[]>("/api/operator/zones"),
};