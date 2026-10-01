// lib/dispatcher/data.ts
// Sample data standing in for API/DB calls. Replace each export with a
// fetch to /api/... once the backend exists; the page components don't
// need to change shape if you keep these same field names.

import {
  Order,
  Vehicle,
  RouteStop,
  RouteSummary,
  DriverSyncRow,
  CapacityWeek,
} from "./types";

export const ORDERS: Order[] = [
  { id: "ORD-4018", outletId: "OUT003", outletName: "Galle Rd Supermart", tempClass: "Ambient", weightKg: 380, volumeM3: 1.9, window: "by 8:00 AM" },
  { id: "ORD-4021", outletId: "OUT014", outletName: "Crescat Mall", tempClass: "Chilled", weightKg: 210, volumeM3: 1.4, vanOnly: true, window: "Mall window 4–6 PM" },
  { id: "ORD-4025", outletId: "OUT027", outletName: "Nugegoda Fresh", tempClass: "Chilled", weightKg: 640, volumeM3: 3.2, window: "by 7:30 AM" },
  { id: "ORD-4030", outletId: "OUT031", outletName: "Kadawatha Mart", tempClass: "Ambient", weightKg: 900, volumeM3: 4.5, window: "by 8:00 AM" },
  { id: "ORD-4041", outletId: "OUT018", outletName: "Rajagiriya Fresh", tempClass: "Chilled", weightKg: 1100, volumeM3: 5.5, window: "by 8:00 AM" },
  { id: "ORD-4044", outletId: "OUT006", outletName: "Nawala Cash & Carry", tempClass: "Ambient", weightKg: 1400, volumeM3: 6.8, window: "by 8:00 AM" },
  { id: "ORD-4047", outletId: "OUT022", outletName: "Liberty Plaza", tempClass: "Chilled", weightKg: 520, volumeM3: 2.6, vanOnly: true, window: "Mall window 3–5 PM" },
  { id: "ORD-4050", outletId: "OUT035", outletName: "Borella Frozen", tempClass: "Frozen", weightKg: 700, volumeM3: 3.4, window: "by 8:00 AM" },
  { id: "ORD-4036", outletId: "OUT009", outletName: "Maharagama Store", tempClass: "Frozen", weightKg: 300, volumeM3: 1.6, window: "by 8:00 AM", pastCutoff: true },
];

export const VEHICLES: Vehicle[] = [
  { id: "VEH014", driver: "N. Perera", typeLabel: "Reefer truck", refrigerated: true, weightCapKg: 2500, volumeCapM3: 12, usedKg: 1550, usedM3: 8.5, fuelQuotaPctLeft: 52, routesToday: 1 },
  { id: "VEH022", driver: "R. Jayasinghe", typeLabel: "Ambient truck", weightCapKg: 3000, volumeCapM3: 14, usedKg: 2640, usedM3: 9.1, fuelQuotaPctLeft: 6, routesToday: 2 },
  { id: "VEH007", driver: "D. Dias", typeLabel: "Reefer van", refrigerated: true, van: true, weightCapKg: 800, volumeCapM3: 4, usedKg: 320, usedM3: 2.2, fuelQuotaPctLeft: 78, routesToday: 1 },
  { id: "VEH003", driver: "K. Silva", typeLabel: "Ambient truck", weightCapKg: 3000, volumeCapM3: 14, usedKg: 1620, usedM3: 5.6, fuelQuotaPctLeft: 70, routesToday: 1 },
];

export const ROUTES_TODAY: RouteSummary[] = [
  { vehicleId: "VEH014", driver: "N. Perera", vehicleType: "Reefer truck", status: "onPlan", nextStop: "142 Galle Rd, Colombo 03", eta: "2:15 PM", stopsLeft: "4 of 11" },
  { vehicleId: "VEH022", driver: "R. Jayasinghe", vehicleType: "Ambient truck", status: "deferred", nextStop: "7 Station Rd, Nugegoda", eta: "3:40 PM", stopsLeft: "6 of 9" },
  { vehicleId: "VEH003", driver: "K. Silva", vehicleType: "Ambient truck", status: "late", nextStop: "28 High Level Rd, Maharagama", eta: "1:05 PM", stopsLeft: "2 of 8" },
  { vehicleId: "VEH007", driver: "D. Dias", vehicleType: "Reefer van", status: "onPlan", nextStop: "Crescat Mall, Colombo 03", eta: "4:00 PM", stopsLeft: "7 of 10" },
  { vehicleId: "VEH011", driver: "A. Wickrama", vehicleType: "Ambient truck", status: "delivered", nextStop: "Route complete", eta: "—", stopsLeft: "0 of 12" },
];

export const ROUTE_STOPS: Record<string, RouteStop[]> = {
  VEH014: [
    { seq: 1, outletId: "OUT003", outletName: "Galle Rd Supermart", window: "by 8:00 AM", eta: "6:10 AM", unloading: "Rear dock", lateRiskPct: 6 },
    { seq: 2, outletId: "OUT014", outletName: "Crescat Mall", window: "4–6 PM", eta: "4:05 PM", unloading: "Shared mall bay", lateRiskPct: 9, vanOnly: true },
    { seq: 3, outletId: "OUT027", outletName: "Nugegoda Fresh", window: "by 7:30 AM", eta: "7:22 AM", unloading: "Curb", lateRiskPct: 34 },
    { seq: 4, outletId: "OUT031", outletName: "Kadawatha Mart", window: "by 8:00 AM", eta: "7:48 AM", unloading: "Rear dock", lateRiskPct: 18 },
  ],
};

export const DRIVERS: DriverSyncRow[] = [
  { driver: "N. Perera", vehicleId: "VEH014", lastSyncedMin: 2, queuedRecords: 0 },
  { driver: "R. Jayasinghe", vehicleId: "VEH022", lastSyncedMin: 5, queuedRecords: 3 },
  { driver: "K. Silva", vehicleId: "VEH003", lastSyncedMin: 12, queuedRecords: 4 },
  { driver: "D. Dias", vehicleId: "VEH007", lastSyncedMin: 1, queuedRecords: 0 },
];

export const CAPACITY_WEEKS: CapacityWeek[] = [
  {
    label: "Week 41 (Sep 28 – Oct 4) · normal",
    totalVolumeM3: 352.4,
    chilledVolumeM3: 118.9,
    gaps: [
      { resource: "Refrigerated vehicles", needed: 9, available: 9 },
      { resource: "Ambient / dry-box trucks", needed: 18, available: 22 },
      { resource: "Vans (van-only outlets)", needed: 4, available: 4 },
      { resource: "Drivers", needed: 30, available: 30 },
    ],
  },
  {
    label: "Week 42 (Oct 5 – Oct 11) · festival ramp",
    totalVolumeM3: 412.7,
    chilledVolumeM3: 151.3,
    gaps: [
      { resource: "Refrigerated vehicles", needed: 11, available: 9 },
      { resource: "Ambient / dry-box trucks", needed: 18, available: 22 },
      { resource: "Vans (van-only outlets)", needed: 5, available: 4 },
      { resource: "Drivers", needed: 34, available: 30 },
    ],
  },
  {
    label: "Week 43 (Oct 12 – Oct 18) · normal",
    totalVolumeM3: 361.0,
    chilledVolumeM3: 124.2,
    gaps: [
      { resource: "Refrigerated vehicles", needed: 9, available: 9 },
      { resource: "Ambient / dry-box trucks", needed: 17, available: 22 },
      { resource: "Vans (van-only outlets)", needed: 4, available: 4 },
      { resource: "Drivers", needed: 31, available: 30 },
    ],
  },
];
