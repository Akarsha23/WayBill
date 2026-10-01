// lib/dispatcher/types.ts
// Shared types for the dispatcher module. Keep these in sync with whatever
// shape the API routes / database end up returning.

export type TempClass = "Ambient" | "Chilled" | "Frozen";

export type RouteStatus = "onPlan" | "deferred" | "late" | "delivered";

export interface Order {
  id: string;
  outletId: string;
  outletName: string;
  tempClass: TempClass;
  weightKg: number;
  volumeM3: number;
  vanOnly?: boolean;
  window?: string;
  pastCutoff?: boolean;
}

export interface Vehicle {
  id: string;
  driver: string;
  typeLabel: string;
  refrigerated?: boolean;
  van?: boolean;
  weightCapKg: number;
  volumeCapM3: number;
  usedKg: number;
  usedM3: number;
  fuelQuotaPctLeft: number;
  routesToday: number; // max 2 per operating day
}

export interface RouteStop {
  seq: number;
  outletId: string;
  outletName: string;
  window: string;
  eta: string;
  unloading: "Rear dock" | "Curb" | "Shared mall bay";
  lateRiskPct: number; // Datathon estimate, illustrative
  vanOnly?: boolean;
}

export interface RouteSummary {
  vehicleId: string;
  driver: string;
  vehicleType: string;
  status: RouteStatus;
  nextStop: string;
  eta: string;
  stopsLeft: string;
}

export const DEFERRAL_REASONS = [
  "Vehicle at weight or volume limit",
  "Fuel quota reached",
  "Cannot meet outlet window",
  "Cold-chain vehicle unavailable",
  "Ordered after cutoff",
] as const;

export type DeferralReason = (typeof DEFERRAL_REASONS)[number];

export interface DecisionEvent {
  actor: string;
  time: string;
  action: string;
  detail?: string;
}

export interface DriverSyncRow {
  driver: string;
  vehicleId: string;
  lastSyncedMin: number;
  queuedRecords: number;
  offline?: boolean;
}

export interface CapacityGapRow {
  resource: string;
  needed: number;
  available: number;
}

export interface CapacityWeek {
  label: string;
  totalVolumeM3: number;
  chilledVolumeM3: number;
  gaps: CapacityGapRow[];
}
