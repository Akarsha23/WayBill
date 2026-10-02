// ==========================================
// Database Enums & Types
// ==========================================

export type TempCapability = "ambient" | "reefer" | "Chilled" | "Frozen";

export type VehicleType = "truck" | "van";

export type FuelType = "diesel" | "petrol" | "electric";

export type DockType = "street" | "rear_dock" | "mall_bay" | "side_bay";

export type ParkingConstraint =
  | "van_only"
  | "normal"
  | "mall_dock"
  | "unrestricted"
  | "truck_restricted";

export type RouteStatus = "on" | "df" | "late" | "done";

// ==========================================
// Core Entities (Database Aligned)
// ==========================================

export interface Depot {
  depot: string; // Primary key e.g. "Peliyagoda", "Kandy"
  name: string;
  district: string;
  location?: any; // PostGIS geometry point or GeoJSON
}

export interface Outlet {
  outlet_id: string; // Primary key e.g. "OUT001"
  brand: string;
  district: string;
  depot: string; // Foreign key referencing Depot
  dock_type: DockType;
  parking_constraint: ParkingConstraint;
  mall_window?: string | null;
  window_open_time: string;
  window_close_time: string;
  location?: any; // PostGIS geometry point or GeoJSON
}

export interface Vehicle {
  vehicle_id: string; // Primary key e.g. "VEH001"
  type: VehicleType;
  temp: TempCapability;
  weight_cap_kg: number;
  volume_cap_m3: number;
  fuel_type: FuelType;
  km_per_l: number;
  weekly_fuel_quota_l: number;
  depot: string; // Foreign key referencing Depot
  current_anchor?: any; // PostGIS geometry point or GeoJSON
  routes_today: number;
  
  // UI Dynamic / Calculated State
  name?: string;
  usedKg?: number;
  usedM3?: number;
  fuelPct?: number;
  van?: boolean;
  refrigerated?: boolean;
}

// ==========================================
// Dispatcher & Order Management
// ==========================================

export interface Order {
  id: string;
  outlet_id: string;
  outletName: string;
  temp: TempCapability;
  kg: number;
  m3: number;
  vanOnly: boolean;
  lat: number;
  lng: number;
  unassignableReason?: string;
}

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