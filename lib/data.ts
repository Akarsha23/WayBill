import type { DispatchRoute, DriverSync, Order, Vehicle } from "./types";

export const ORDERS: Order[] = [
  { id: "ORD-4018", outlet: "OUT003 Galle Rd Supermart", temp: "Ambient", kg: 380, m3: 1.9 },
  { id: "ORD-4021", outlet: "OUT014 Crescat Mall (van only)", temp: "Chilled", kg: 210, m3: 1.4, vanOnly: true },
  { id: "ORD-4025", outlet: "OUT027 Nugegoda Fresh", temp: "Chilled", kg: 640, m3: 3.2 },
  { id: "ORD-4030", outlet: "OUT031 Kadawatha Mart", temp: "Ambient", kg: 900, m3: 4.5 },
  { id: "ORD-4042", outlet: "OUT018 Colombo Bulk Coldstore", temp: "Chilled", kg: 3500, m3: 15.0 },
];

export const VEHICLES: Vehicle[] = [
  { id: "VEH014", name: "Reefer truck", refrigerated: true, maxKg: 2500, usedKg: 1550, maxM3: 12, usedM3: 8.5, fuelPct: 52, routesToday: 1 },
  { id: "VEH022", name: "Ambient truck", maxKg: 3000, usedKg: 2640, maxM3: 14, usedM3: 9.1, fuelPct: 6, routesToday: 2 },
  { id: "VEH007", name: "Reefer van", refrigerated: true, van: true, maxKg: 800, usedKg: 320, maxM3: 4, usedM3: 2.2, fuelPct: 78, routesToday: 1 },
  { id: "VEH003", name: "Ambient truck", maxKg: 3000, usedKg: 1620, maxM3: 14, usedM3: 5.6, fuelPct: 70, routesToday: 1 },
];

export const ROUTES: DispatchRoute[] = [
  { driver: "N. Perera", vehicleId: "VEH014", vehicleName: "Reefer truck", status: "on", label: "On plan", nextStop: "142 Galle Rd, Colombo 03", eta: "2:15 PM", progress: "4 of 11", action: "Open" },
  { driver: "R. Jayasinghe", vehicleId: "VEH022", vehicleName: "Ambient truck", status: "df", label: "Deferred", nextStop: "7 Station Rd, Nugegoda", eta: "3:40 PM", progress: "6 of 9", action: "Defer" },
  { driver: "K. Silva", vehicleId: "VEH003", vehicleName: "Ambient truck", status: "late", label: "Late", nextStop: "28 High Level Rd, Maharagama", eta: "1:05 PM", progress: "2 of 8", action: "Call" },
  { driver: "D. Dias", vehicleId: "VEH007", vehicleName: "Reefer van", status: "on", label: "On plan", nextStop: "Crescat Mall, Colombo 03", eta: "4:00 PM", progress: "7 of 10", action: "Open" },
  { driver: "A. Wickrama", vehicleId: "VEH011", vehicleName: "Ambient truck", status: "done", label: "Delivered", nextStop: "Route complete", eta: "", progress: "0 of 12", action: "Trail" },
];

export const DRIVER_SYNC: DriverSync[] = [
  { driver: "N. Perera", vehicleId: "VEH014", minutesAgo: 2, queued: 0 },
  { driver: "R. Jayasinghe", vehicleId: "VEH022", minutesAgo: 5, queued: 3 },
  { driver: "K. Silva", vehicleId: "VEH003", minutesAgo: 12, queued: 4 },
  { driver: "D. Dias", vehicleId: "VEH007", minutesAgo: 1, queued: 0 },
];
