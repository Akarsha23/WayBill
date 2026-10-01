export type Temp = "Ambient" | "Chilled";

export interface Order {
  id: string;
  outlet: string;
  temp: Temp;
  kg: number;
  m3: number;
  vanOnly?: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  refrigerated?: boolean;
  van?: boolean;
  maxKg: number;
  usedKg: number;
  maxM3: number;
  usedM3: number;
  fuelPct: number;
  routesToday: number;
}

export type RouteStatus = "on" | "df" | "late" | "done";

export interface DispatchRoute {
  driver: string;
  vehicleId: string;
  vehicleName: string;
  status: RouteStatus;
  label: string;
  nextStop: string;
  eta: string;
  progress: string;
  action: "Open" | "Defer" | "Call" | "Trail";
}

export interface DriverSync {
  driver: string;
  vehicleId: string;
  minutesAgo: number;
  queued: number;
}
