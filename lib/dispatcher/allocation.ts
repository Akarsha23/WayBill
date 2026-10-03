// lib/dispatcher/allocation.ts
// Pure, framework-free engine for the Tech-Triathlon feasibility rules (booklet p.20-21).

export type Brand = "Fresh" | "Style" | "Tech";

export interface Order {
  id: string; // order_code
  dbId: string;
  outletId: string;
  brand: Brand;
  district: string;
  depot: string;
  dock: string;
  vanOnly: boolean;
  mallWindow: string | null; // "HH:MM-HH:MM"
  open: number; // minutes since midnight
  close: number;
  chilled: boolean;
  kg: number;
  m3: number;
  deferredYesterday: number;
  daysSinceServed: number;
  label: string;
}

export interface Vehicle {
  id: string;
  type: "truck" | "van";
  reefer: boolean;
  kg: number;
  m3: number;
  kmPerL: number;
  quotaL: number;
  usedL: number; // litres already consumed this week
  depot: string;
}

export interface Trip {
  vehicleId: string;
  tripId: 1 | 2;
  brand: Brand;
  district: string;
  orders: Order[]; // kept in delivery sequence
}

export interface Travel {
  toDistrictMin: number;
  toDistrictKm: number;
  interMin: number;
  interKm: number;
}

export interface Ctx {
  travel: Record<string, Travel>; // key: district
  allowance: Record<string, number>; // key: `${brand}|${dock}`
}

export type Rule = [ok: boolean, pass: string, fail: string];

// Fresh must be delivered 03:30-08:00; others run in the trading day (assumption: 06:00 start).
export const START = { Fresh: 210, other: 360 };
export const BUDGET = { Fresh: 270, other: 480 };

export const toMin = (t?: string | null) => {
  if (!t) return 0;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};
export const fmt = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;

const group = (b: Brand) => (b === "Fresh" ? "Fresh" : "other");
const allow = (o: Order, ctx: Ctx) => ctx.allowance[`${o.brand}|${o.dock}`] ?? 15;

/** The window an outlet accepts goods in: the mall's fixed window wins over the outlet's own. */
export function windowOf(o: Order): [number, number] {
  if (o.mallWindow) {
    const [a, b] = o.mallWindow.split("-");
    return [toMin(a), toMin(b)];
  }
  return [o.open, o.close];
}

/** Trip time = outbound + inter-stop x (n-1) + handling. Return leg is excluded (already budgeted). */
export function simulate(t: Trip, ctx: Ctx) {
  const tr = ctx.travel[t.district];
  if (!tr) return null;
  const orders = [...t.orders].sort((a, b) => windowOf(a)[1] - windowOf(b)[1]);
  let clock = START[group(t.brand)] + tr.toDistrictMin;
  const arrivals: number[] = [];
  const late: Order[] = [];
  let handling = 0;
  orders.forEach((o, i) => {
    if (i > 0) clock += tr.interMin;
    const [open, close] = windowOf(o);
    const arr = Math.max(clock, open); // early arrival waits for window to open
    arrivals.push(arr);
    if (arr > close) late.push(o);
    clock = arr + allow(o, ctx);
    handling += allow(o, ctx);
  });
  const n = orders.length;
  return {
    orders,
    arrivals,
    late,
    minutes: tr.toDistrictMin + tr.interMin * (n - 1) + handling,
    km: tr.toDistrictKm * 2 + tr.interKm * (n - 1), // fuel includes the return leg
  };
}

export interface Evaluation {
  rules: Rule[];
  ok: boolean;
  trip: Trip | null; // hypothetical trip including the order
  existing: Trip | null; // trip it would join (null = opens a new trip)
  etaByOrder: Record<string, string>;
  minutes?: number;
}

/** Check one order against one vehicle, joining a same brand/district trip or opening a new one. */
export function evaluate(o: Order, v: Vehicle, allTrips: Trip[], ctx: Ctx): Evaluation {
  const mine = allTrips.filter((t) => t.vehicleId === v.id);
  const existing = mine.find((t) => t.brand === o.brand && t.district === o.district) ?? null;
  const base: Rule[] = [
    [v.depot === o.depot, `Home depot matches (${v.depot})`, `Vehicle is based at ${v.depot}, outlet is served from ${o.depot}`],
    [!o.chilled || v.reefer, "Cold-chain compatible", "Chilled goods need a refrigerated vehicle"],
    [!o.vanOnly || v.type === "van", "Outlet access OK", "Van-only outlet cannot be served by a truck"],
  ];
  const slot = existing ?? (mine.length < 2 ? ({ tripId: (mine.some((t) => t.tripId === 1) ? 2 : 1) as 1 | 2 } as Trip) : null);
  if (!slot) {
    return {
      rules: [...base, [false, "", "Both trips are used by other brand/district runs"]],
      ok: false, trip: null, existing: null, etaByOrder: {},
    };
  }
  const trip: Trip = {
    vehicleId: v.id, tripId: slot.tripId, brand: o.brand, district: o.district,
    orders: [...(existing?.orders ?? []), o],
  };
  const sim = simulate(trip, ctx);
  if (!sim) {
    return {
      rules: [...base, [false, "", `No travel data for ${o.district}`]],
      ok: false, trip, existing, etaByOrder: {},
    };
  }
  trip.orders = sim.orders;
  const kg = trip.orders.reduce((s, x) => s + x.kg, 0);
  const m3 = trip.orders.reduce((s, x) => s + x.m3, 0);

  // Other trips on this vehicle, sharing (or not sharing) the same time budget / fuel quota.
  const others = mine.filter((t) => t !== existing);
  const sameGroup = others.filter((t) => group(t.brand) === group(o.brand));
  const groupMin = sameGroup.reduce((s, t) => s + (simulate(t, ctx)?.minutes ?? 0), 0) + sim.minutes;
  const budget = BUDGET[group(o.brand)];
  const fuelL = (sim.km + others.reduce((s, t) => s + (simulate(t, ctx)?.km ?? 0), 0)) / v.kmPerL;
  const fuelTotal = v.usedL + fuelL;
  const lateIds = sim.late.map((x) => x.id).join(", ");

  const rules: Rule[] = [
    ...base,
    [true, `Trip ${trip.tripId}: ${o.brand} · ${o.district}`, ""],
    [kg <= v.kg, `Weight fits (${kg.toFixed(0)} of ${v.kg} kg)`, `Over weight limit (${kg.toFixed(0)} of ${v.kg} kg)`],
    [m3 <= v.m3, `Volume fits (${m3.toFixed(1)} of ${v.m3} m³)`, `Over volume limit (${m3.toFixed(1)} of ${v.m3} m³)`],
    [groupMin <= budget, `Time budget OK (${groupMin} of ${budget} min)`, `Over time budget (${groupMin} of ${budget} min)`],
    [sim.late.length === 0, "All stops arrive inside their delivery windows", `Arrives after window closes: ${lateIds}`],
    [fuelTotal <= v.quotaL, `Fuel quota OK (${fuelTotal.toFixed(0)} of ${v.quotaL} L)`, `Over weekly fuel quota (${fuelTotal.toFixed(0)} of ${v.quotaL} L)`],
  ];
  const etaByOrder: Record<string, string> = {};
  sim.orders.forEach((x, i) => (etaByOrder[x.id] = fmt(sim.arrivals[i])));
  return { rules, ok: rules.every((r) => r[0]), trip, existing, etaByOrder, minutes: sim.minutes };
}

export interface AutoResult {
  trips: Trip[];
  changed: Trip[];
  assigned: Order[];
  deferred: { order: Order; reason: string }[];
}

/** Deferred-yesterday and long-skipped outlets first, then Fresh, then tightest window. */
export const byPriority = (a: Order, b: Order) =>
  b.deferredYesterday - a.deferredYesterday ||
  b.daysSinceServed - a.daysSinceServed ||
  Number(b.brand === "Fresh") - Number(a.brand === "Fresh") ||
  windowOf(a)[1] - windowOf(b)[1];

export function autoAllocate(orders: Order[], vehicles: Vehicle[], current: Trip[], ctx: Ctx): AutoResult {
  let trips = [...current];
  const changed = new Set<Trip>();
  const assigned: Order[] = [];
  const deferred: AutoResult["deferred"] = [];

  for (const o of [...orders].sort(byPriority)) {
    let best: { ev: Evaluation; score: number } | null = null;
    const blockers = new Map<string, number>();
    for (const v of vehicles) {
      const ev = evaluate(o, v, trips, ctx);
      if (ev.ok && ev.trip) {
        // Prefer joining an existing trip, then the tightest-fitting vehicle (saves big trucks).
        const used = ev.trip.orders.reduce((s, x) => s + x.m3, 0);
        const score = (ev.existing ? 0 : 1e6) + (v.m3 - used);
        if (!best || score < best.score) best = { ev, score };
      } else if (v.depot === o.depot) {
        const first = ev.rules.find((r) => !r[0]);
        if (first) blockers.set(first[2], (blockers.get(first[2]) ?? 0) + 1);
      }
    }
    if (best?.ev.trip) {
      const { ev } = best;
      trips = ev.existing ? trips.map((t) => (t === ev.existing ? ev.trip! : t)) : [...trips, ev.trip];
      if (ev.existing) changed.delete(ev.existing);
      changed.add(ev.trip);
      assigned.push(o);
    } else {
      const top = [...blockers.entries()].sort((a, b) => b[1] - a[1])[0];
      deferred.push({
        order: o,
        reason: top ? `${top[0]} (blocked ${top[1]} vehicle${top[1] > 1 ? "s" : ""})` : `No available vehicle at ${o.depot}`,
      });
    }
  }
  return { trips, changed: [...changed], assigned, deferred };
}

export function vehicleSummary(v: Vehicle, trips: Trip[], ctx: Ctx) {
  const mine = trips.filter((t) => t.vehicleId === v.id);
  const mins = (g: "Fresh" | "other") =>
    mine.filter((t) => group(t.brand) === g).reduce((s, t) => s + (simulate(t, ctx)?.minutes ?? 0), 0);
  const km = mine.reduce((s, t) => s + (simulate(t, ctx)?.km ?? 0), 0);
  return { trips: mine.length, freshMin: mins("Fresh"), otherMin: mins("other"), fuelL: v.usedL + km / v.kmPerL };
}