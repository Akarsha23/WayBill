// lib/dispatcher/rules.ts
// The six operating constraints, as pure functions, plus a greedy
// assisted-planning allocator. Both the manual "Allocate" screen and the
// "Suggest plan" screen call checkAssignment, so the rules only live here.

import { DeferralReason, Order, Vehicle } from "./types";

export interface RuleResult {
  key: string;
  label: string;
  ok: boolean;
  failureLabel: string;
}

/**
 * Checks one order against one vehicle's *current* usage. Pass the
 * vehicle's live usedKg/usedM3/routesToday — the caller decides whether
 * that's the vehicle's real current load or a hypothetical one (as
 * suggestPlan does while it works through the order list).
 */
export function checkAssignment(order: Order, vehicle: Vehicle): RuleResult[] {
  return [
    {
      key: "weight",
      label: "Weight fits",
      ok: vehicle.usedKg + order.weightKg <= vehicle.weightCapKg,
      failureLabel: `Over weight limit (${vehicle.usedKg + order.weightKg} of ${vehicle.weightCapKg} kg)`,
    },
    {
      key: "volume",
      label: "Volume fits",
      ok: vehicle.usedM3 + order.volumeM3 <= vehicle.volumeCapM3,
      failureLabel: "Over volume limit",
    },
    {
      key: "coldChain",
      label: "Cold-chain compatible",
      ok: order.tempClass === "Ambient" || !!vehicle.refrigerated,
      failureLabel: "Chilled or frozen goods need a refrigerated vehicle",
    },
    {
      key: "vanOnly",
      label: "Outlet access OK",
      ok: !order.vanOnly || !!vehicle.van,
      failureLabel: "Van-only outlet: trucks cannot serve it",
    },
    {
      key: "routesPerDay",
      label: "Route count OK",
      ok: vehicle.routesToday < 2,
      failureLabel: `Vehicle already ran 2 routes today`,
    },
    {
      key: "fuelQuota",
      label: "Fuel quota OK",
      ok: vehicle.fuelQuotaPctLeft > 10,
      failureLabel: `Fuel quota nearly used (${vehicle.fuelQuotaPctLeft}% left)`,
    },
  ];
}

export function passesAllRules(order: Order, vehicle: Vehicle): boolean {
  return checkAssignment(order, vehicle).every((r) => r.ok);
}

export function suggestedReason(order: Order, vehicles: Vehicle[]): DeferralReason {
  // Best-effort guess at *why* nothing fit, for the dispatcher to confirm or change.
  const anyColdChainCapable = vehicles.some(
    (v) => order.tempClass === "Ambient" || v.refrigerated
  );
  if (!anyColdChainCapable) return "Cold-chain vehicle unavailable";

  const anyVanCapable = vehicles.some((v) => !order.vanOnly || v.van);
  if (!anyVanCapable) return "Cannot meet outlet window";

  const anyFuelLeft = vehicles.some((v) => v.fuelQuotaPctLeft > 10);
  if (!anyFuelLeft) return "Fuel quota reached";

  return "Vehicle at weight or volume limit";
}

export interface PlanAssignment {
  vehicleId: string | null;
  reason?: DeferralReason;
}

export type Plan = Record<string, PlanAssignment>; // keyed by order.id

/**
 * Greedy assisted allocation: largest / most constrained orders first,
 * each placed on the vehicle with the most remaining headroom among
 * those that pass every rule. Deterministic, so re-running without
 * data changes gives the same plan — useful for demoing and testing.
 */
export function suggestPlan(orders: Order[], vehicles: Vehicle[]): Plan {
  // Work on copies so repeated calls don't mutate shared sample data.
  const working: Vehicle[] = vehicles.map((v) => ({ ...v }));
  const plan: Plan = {};

  const ordered = [...orders]
    .filter((o) => !o.pastCutoff)
    .sort((a, b) => {
      // Ambient last (most flexible), van-only first (most constrained), then by size.
      const aAmbient = a.tempClass === "Ambient" ? 1 : 0;
      const bAmbient = b.tempClass === "Ambient" ? 1 : 0;
      if (aAmbient !== bAmbient) return aAmbient - bAmbient;
      const aVan = a.vanOnly ? 1 : 0;
      const bVan = b.vanOnly ? 1 : 0;
      if (aVan !== bVan) return bVan - aVan;
      return b.weightKg - a.weightKg;
    });

  for (const order of ordered) {
    let best: Vehicle | null = null;
    let bestHeadroom = -Infinity;

    for (const v of working) {
      if (!passesAllRules(order, v)) continue;
      const headroom = v.weightCapKg - v.usedKg - order.weightKg;
      // Prefer not "wasting" a refrigerated vehicle on an ambient order.
      const score = headroom + (order.tempClass === "Ambient" && v.refrigerated ? 100000 : 0);
      if (score > bestHeadroom) {
        bestHeadroom = score;
        best = v;
      }
    }

    if (best) {
      best.usedKg += order.weightKg;
      best.usedM3 += order.volumeM3;
      plan[order.id] = { vehicleId: best.id };
    } else {
      plan[order.id] = { vehicleId: null, reason: suggestedReason(order, vehicles) };
    }
  }

  // Orders already past cutoff are deferred with a fixed reason, not run through the rules.
  for (const order of orders.filter((o) => o.pastCutoff)) {
    plan[order.id] = { vehicleId: null, reason: "Ordered after cutoff" };
  }

  return plan;
}

/** Vehicles' used capacity after applying a plan — for the "load after this plan" view. */
export function loadsAfterPlan(
  orders: Order[],
  vehicles: Vehicle[],
  plan: Plan,
  skipOrderId?: string
): Vehicle[] {
  const working: Vehicle[] = vehicles.map((v) => ({ ...v }));
  for (const order of orders) {
    if (order.id === skipOrderId) continue;
    const a = plan[order.id];
    if (!a?.vehicleId) continue;
    const v = working.find((x) => x.id === a.vehicleId);
    if (v) {
      v.usedKg += order.weightKg;
      v.usedM3 += order.volumeM3;
    }
  }
  return working;
}
